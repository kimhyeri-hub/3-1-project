import boto3
from config import settings

dynamodb = boto3.resource('dynamodb', region_name=settings.DYNAMODB_REGION)

USERS_TABLE     = dynamodb.Table('sgu-yaksok-1-users')
MEDICINES_TABLE = dynamodb.Table('sgu-yaksok-1-medicines')
SCHEDULES_TABLE = dynamodb.Table('sgu-yaksok-1-schedules')
