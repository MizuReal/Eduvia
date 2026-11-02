declare module 'mammoth' {
  export type MammothMessage = {
    type: string
    message: string
  }

  export function convertToHtml(input: {
    buffer: Buffer
  }): Promise<{ value: string; messages: MammothMessage[] }>
}
