import * as AWS from 'aws-sdk'
//import * as AWSXRay from 'aws-xray-sdk'
import { DocumentClient } from 'aws-sdk/clients/dynamodb'
import { createLogger } from '../utils/logger'
import { TodoItem } from '../models/TodoItem';
import { TodoUpdate } from '../models/TodoUpdate';
import { Types } from 'aws-sdk/clients/s3';

const AWSXRay = require('aws-xray-sdk')
const XAWS = AWSXRay.captureAWS(AWS)

const logger = createLogger('TodosAccess')


export class TodosAccess {
    constructor(
        private readonly docClient:DocumentClient = createDynamoDBClient(),
        private readonly todosTable = process.env.TODOS_TABLE,
        private readonly s3Client: Types = new AWS.S3({signatureVersion: 'v4'}),
        private readonly s3BucketName = process.env.S3_BUCKET_NAME
    ){}

    async getTodoItem(userId: string, todoId: string): Promise<TodoItem>{
        return (
            await this.docClient.get({
                TableName: this.todosTable,
                Key:{
                    userId,
                    todoId
                }
            }).promise()
        ).Item as TodoItem
    }

    async getAllTodos(userId: string):Promise<TodoItem[]>{
        logger.info('Get all todo')
        const result = await this.docClient.query({
            TableName: this.todosTable,
            KeyConditionExpression: 'userId = :userId',
            ExpressionAttributeValues: {
              ':userId': userId
            }
        }).promise()
        
        return result.Items as TodoItem[]
    }

    async createTodo(todoItem: TodoItem): Promise<TodoItem> {
        logger.info('Create new todo')
        await this.docClient.put({
            TableName: this.todosTable,
            Item: todoItem
          }).promise()

        return todoItem
    }

    async deleteTodoItem(userId: string, todoId: string) {
      logger.info(`delete todo ${todoId}`)
      await this.docClient.delete({
        TableName: this.todosTable,
        Key: {
          userId,
          todoId
        }
      }).promise()
    }

    async updateTodoItem(userId: string, todoId: string, todoUpdate: TodoUpdate) {
        logger.info(`Update todo on ${todoId} with ${JSON.stringify(todoUpdate)}`)
        await this.docClient.update({
            TableName: this.todosTable,
            Key: {
              userId,
              todoId
            },
            UpdateExpression: 'set #name = :name, dueDate = :dueDate, done = :done',
            ExpressionAttributeNames: {
              '#name': 'name'
            },
            ExpressionAttributeValues: {
              ':name': todoUpdate.name,
              ':dueDate': todoUpdate.dueDate,
              ':done': todoUpdate.done
            }
          }).promise()
    }

    async updateAttachmentUrl(userId: string, todoId: string, newUrl: string, description?: string) {
        logger.info(
          `Updating ${newUrl} attachment URL for todo ${todoId} of table ${this.todosTable}`
        )
    
        await this.docClient.update({
          TableName: this.todosTable,
          Key: {
            userId,
            todoId
          },
          UpdateExpression: 'set attachmentUrl = :attachmentUrl',
          ExpressionAttributeValues: {
            ':attachmentUrl': newUrl
          }
        }).promise()
    }
}

function createDynamoDBClient(): DocumentClient {
    if (process.env.IS_OFFLINE) {
      logger.info('Creating a local DynamoDB instance')
      return new XAWS.DynamoDB.DocumentClient({
        region: 'localhost',
        endpoint: 'http://localhost:8000'
      })
    }
  
    return new XAWS.DynamoDB.DocumentClient()
}
