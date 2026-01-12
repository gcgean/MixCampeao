declare global {
  namespace Express {
    interface Request {
      rawBody?: Buffer
      user?: {
        id: string
        email: string
        role: 'customer' | 'admin'
      }
    }
  }
}

export {}

