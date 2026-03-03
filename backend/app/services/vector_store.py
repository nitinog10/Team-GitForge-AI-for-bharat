"""
Vector Store Service - AWS DynamoDB Integration

Layer 2: Logic Engine component for storing and retrieving code chunks.
Uses DynamoDB for storage with metadata-based filtering.
"""

import os
import json
from typing import List, Optional, Dict, Any
import uuid

import boto3
from boto3.dynamodb.conditions import Key, Attr
from botocore.exceptions import ClientError

from app.config import get_settings
from app.models.schemas import CodeChunk, NodeType

settings = get_settings()


def _get_table_name():
    """Get the DynamoDB table name for code chunks"""
    return f"{settings.dynamodb_table_prefix}_code_chunks"


def _get_dynamodb_resource():
    """Get a boto3 DynamoDB resource"""
    kwargs = {"region_name": settings.aws_region}
    if settings.aws_access_key_id and settings.aws_secret_access_key:
        kwargs["aws_access_key_id"] = settings.aws_access_key_id
        kwargs["aws_secret_access_key"] = settings.aws_secret_access_key
    return boto3.resource("dynamodb", **kwargs)


class VectorStoreService:
    """
    DynamoDB-based store for code chunks.
    
    Enables:
    - Storage and retrieval of parsed code chunks
    - Filtering by repository, file path, chunk type
    - Contextual retrieval for documentation generation
    """
    
    def __init__(self):
        self._table = None
        self._initialized = False
    
    def _initialize(self):
        """Lazy initialization of DynamoDB table reference"""
        if self._initialized:
            return
        
        try:
            dynamodb = _get_dynamodb_resource()
            self._table = dynamodb.Table(_get_table_name())
            # Verify table exists by loading its metadata
            self._table.load()
            self._initialized = True
            print("✅ DynamoDB code_chunks table connected successfully")
        except ClientError as e:
            error_code = e.response["Error"]["Code"]
            if error_code == "ResourceNotFoundException":
                print(f"⚠️ DynamoDB table '{_get_table_name()}' not found. Using mock store.")
                self._table = None
                self._initialized = True
            else:
                print(f"⚠️ DynamoDB initialization failed: {e}")
                self._table = None
                self._initialized = True
        except Exception as e:
            print(f"⚠️ DynamoDB initialization failed: {e}")
            self._table = None
            self._initialized = True
    
    async def add_code_chunks(
        self, 
        chunks: List[CodeChunk],
        repository_id: str
    ) -> int:
        """
        Add code chunks to DynamoDB.
        
        Args:
            chunks: List of CodeChunk objects to store
            repository_id: ID of the repository
            
        Returns:
            Number of chunks added
        """
        self._initialize()
        
        if self._table is None:
            return len(chunks)
        
        try:
            added = 0
            with self._table.batch_writer() as batch:
                for chunk in chunks:
                    # Sanitize metadata
                    sanitized_meta: Dict[str, Any] = {}
                    for k, v in chunk.metadata.items():
                        if v is None:
                            continue
                        if isinstance(v, list):
                            sanitized_meta[k] = ", ".join(str(i) for i in v)
                        elif isinstance(v, (str, int, float, bool)):
                            sanitized_meta[k] = v
                        else:
                            sanitized_meta[k] = str(v)
                    
                    item = {
                        "repository_id": repository_id,
                        "id": chunk.id,
                        "file_path": chunk.file_path,
                        "content": chunk.content,
                        "start_line": chunk.start_line,
                        "end_line": chunk.end_line,
                        "chunk_type": chunk.chunk_type.value,
                        "name": chunk.name or "",
                        "metadata_json": json.dumps(sanitized_meta),
                    }
                    
                    batch.put_item(Item=item)
                    added += 1
            
            return added
            
        except Exception as e:
            print(f"Error adding chunks to DynamoDB: {e}")
            return 0
    
    async def search(
        self,
        query: str,
        repository_id: Optional[str] = None,
        file_path: Optional[str] = None,
        n_results: int = 10,
        chunk_type: Optional[NodeType] = None,
    ) -> List[CodeChunk]:
        """
        Search for relevant code chunks using metadata filters.
        
        Args:
            query: Search query (used for keyword matching in content/name)
            repository_id: Filter by repository
            file_path: Filter by file path
            n_results: Maximum number of results
            chunk_type: Filter by chunk type
            
        Returns:
            List of matching CodeChunk objects
        """
        self._initialize()
        
        if self._table is None:
            return []
        
        try:
            # Build the query/scan
            if repository_id:
                # Use query on partition key
                key_condition = Key("repository_id").eq(repository_id)
                filter_expression = None
                
                if file_path:
                    filter_expression = Attr("file_path").eq(file_path)
                if chunk_type:
                    ct_filter = Attr("chunk_type").eq(chunk_type.value)
                    filter_expression = (
                        ct_filter if filter_expression is None
                        else filter_expression & ct_filter
                    )
                
                # Add keyword filter on content or name
                if query:
                    query_lower = query.lower()
                    kw_filter = Attr("name").contains(query_lower) | Attr("content").contains(query_lower)
                    filter_expression = (
                        kw_filter if filter_expression is None
                        else filter_expression & kw_filter
                    )
                
                kwargs = {
                    "KeyConditionExpression": key_condition,
                    "Limit": n_results,
                }
                if filter_expression:
                    kwargs["FilterExpression"] = filter_expression
                
                response = self._table.query(**kwargs)
            else:
                # Full table scan with filters (less efficient)
                filter_expression = None
                
                if file_path:
                    filter_expression = Attr("file_path").eq(file_path)
                if chunk_type:
                    ct_filter = Attr("chunk_type").eq(chunk_type.value)
                    filter_expression = (
                        ct_filter if filter_expression is None
                        else filter_expression & ct_filter
                    )
                if query:
                    query_lower = query.lower()
                    kw_filter = Attr("name").contains(query_lower) | Attr("content").contains(query_lower)
                    filter_expression = (
                        kw_filter if filter_expression is None
                        else filter_expression & kw_filter
                    )
                
                kwargs = {"Limit": n_results}
                if filter_expression:
                    kwargs["FilterExpression"] = filter_expression
                
                response = self._table.scan(**kwargs)
            
            # Convert results to CodeChunk objects
            chunks = []
            for item in response.get("Items", []):
                metadata = json.loads(item.get("metadata_json", "{}"))
                chunk = CodeChunk(
                    id=item["id"],
                    file_path=item.get("file_path", ""),
                    content=item.get("content", ""),
                    start_line=int(item.get("start_line", 0)),
                    end_line=int(item.get("end_line", 0)),
                    chunk_type=NodeType(item.get("chunk_type", "function")),
                    name=item.get("name") or None,
                    metadata=metadata,
                )
                chunks.append(chunk)
            
            return chunks[:n_results]
            
        except Exception as e:
            print(f"Error searching DynamoDB: {e}")
            return []
    
    async def get_related_chunks(
        self,
        chunk_id: str,
        repository_id: str,
        n_results: int = 5,
    ) -> List[CodeChunk]:
        """
        Find chunks related to a given chunk.
        Returns chunks from the same repository, excluding the source chunk.
        """
        self._initialize()
        
        if self._table is None:
            return []
        
        try:
            # Query chunks from the same repository
            response = self._table.query(
                KeyConditionExpression=Key("repository_id").eq(repository_id),
                Limit=n_results + 1,
            )
            
            chunks = []
            for item in response.get("Items", []):
                if item["id"] == chunk_id:
                    continue
                
                metadata = json.loads(item.get("metadata_json", "{}"))
                chunk = CodeChunk(
                    id=item["id"],
                    file_path=item.get("file_path", ""),
                    content=item.get("content", ""),
                    start_line=int(item.get("start_line", 0)),
                    end_line=int(item.get("end_line", 0)),
                    chunk_type=NodeType(item.get("chunk_type", "function")),
                    name=item.get("name") or None,
                    metadata=metadata,
                )
                chunks.append(chunk)
                
                if len(chunks) >= n_results:
                    break
            
            return chunks
            
        except Exception as e:
            print(f"Error getting related chunks: {e}")
            return []
    
    async def delete_repository(self, repository_id: str) -> bool:
        """Delete all chunks for a repository"""
        self._initialize()
        
        if self._table is None:
            return True
        
        try:
            # Query all chunk IDs for this repository
            response = self._table.query(
                KeyConditionExpression=Key("repository_id").eq(repository_id),
                ProjectionExpression="repository_id, id",
            )
            
            # Batch delete
            with self._table.batch_writer() as batch:
                for item in response.get("Items", []):
                    batch.delete_item(
                        Key={
                            "repository_id": item["repository_id"],
                            "id": item["id"],
                        }
                    )
            
            # Handle pagination
            while response.get("LastEvaluatedKey"):
                response = self._table.query(
                    KeyConditionExpression=Key("repository_id").eq(repository_id),
                    ProjectionExpression="repository_id, id",
                    ExclusiveStartKey=response["LastEvaluatedKey"],
                )
                with self._table.batch_writer() as batch:
                    for item in response.get("Items", []):
                        batch.delete_item(
                            Key={
                                "repository_id": item["repository_id"],
                                "id": item["id"],
                            }
                        )
            
            return True
            
        except Exception as e:
            print(f"Error deleting repository chunks: {e}")
            return False
    
    async def get_file_context(
        self,
        file_path: str,
        repository_id: str,
    ) -> List[CodeChunk]:
        """
        Get all chunks for a file plus related context from dependencies.
        """
        self._initialize()
        
        if self._table is None:
            return []
        
        try:
            # Get chunks from the file itself
            response = self._table.query(
                KeyConditionExpression=Key("repository_id").eq(repository_id),
                FilterExpression=Attr("file_path").eq(file_path),
            )
            
            chunks = []
            for item in response.get("Items", []):
                metadata = json.loads(item.get("metadata_json", "{}"))
                chunk = CodeChunk(
                    id=item["id"],
                    file_path=item.get("file_path", ""),
                    content=item.get("content", ""),
                    start_line=int(item.get("start_line", 0)),
                    end_line=int(item.get("end_line", 0)),
                    chunk_type=NodeType(item.get("chunk_type", "function")),
                    name=item.get("name") or None,
                    metadata=metadata,
                )
                chunks.append(chunk)
            
            # Get a few related chunks from other files in the same repo
            if chunks:
                related_response = self._table.query(
                    KeyConditionExpression=Key("repository_id").eq(repository_id),
                    FilterExpression=Attr("file_path").ne(file_path),
                    Limit=5,
                )
                
                for item in related_response.get("Items", []):
                    metadata = json.loads(item.get("metadata_json", "{}"))
                    metadata["is_context"] = True
                    chunk = CodeChunk(
                        id=item["id"],
                        file_path=item.get("file_path", ""),
                        content=item.get("content", ""),
                        start_line=int(item.get("start_line", 0)),
                        end_line=int(item.get("end_line", 0)),
                        chunk_type=NodeType(item.get("chunk_type", "function")),
                        name=item.get("name") or None,
                        metadata=metadata,
                    )
                    chunks.append(chunk)
            
            return chunks
            
        except Exception as e:
            print(f"Error getting file context: {e}")
            return []
