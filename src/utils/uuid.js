import { v4 as uuidv4 } from 'uuid'

/**
 * 生成UUID的工具函数
 */
export function generateUUID() {
  return uuidv4()
}

export function generateShortId() {
  return Math.random().toString(36).substring(2, 15);
}