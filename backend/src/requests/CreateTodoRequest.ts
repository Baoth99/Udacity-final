/**
 * Fields in a request to create a single TODO item.
 */
export interface CreateTodoRequest {
  name: string
  description: string
  important: boolean
  dueDate: string
}
