import axios, { type AxiosError } from 'axios'

export function isAxiosUnprocessableEntityError<T>(error: unknown): error is AxiosError<T> {
  return axios.isAxiosError(error) && error.response?.status === 422
}
