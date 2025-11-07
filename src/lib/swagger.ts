import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'CSU Server API',
      version: '1.0.0',
      description: 'Central Sync & Update Server API documentation',
      contact: {
        name: 'TradeUnleashed',
        email: 'support@tradeunleashed.example',
      },
      license: {
        name: 'ISC',
        url: 'https://opensource.org/licenses/ISC',
      },
    },
    servers: [
      {
        url: process.env.SWAGGER_SERVER_LOCAL || 'http://localhost:4000',
        description: 'Local Server',
      },
      {
        url: process.env.SWAGGER_SERVER_ONLINE || process.env.API_BASE_URL || 'https://api.example.com',
        description: 'Online Server',
      }
    ],
    tags: [],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }
      },
      schemas: {
        ErrorResponse: {
          type: 'object',
          properties: {
            error: {
              type: 'object',
              properties: {
                code: { type: 'string', example: 'VALIDATION_ERROR' },
                message: { type: 'string', example: 'Invalid request' },
                details: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      path: { type: 'string', example: 'body.email' },
                      message: { type: 'string', example: 'Invalid email format' }
                    }
                  },
                  nullable: true
                }
              }
            }
          }
        },
        AuthUser: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            username: { type: 'string' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            role: { type: 'string' },
            storeId: { type: 'string' }
          }
        },
        LoginResponse: {
          type: 'object',
          properties: {
            token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
            user: { $ref: '#/components/schemas/AuthUser' }
          }
        },
        RegisterResponse: {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'Registration successful. Verification code sent to email.' },
            userId: { type: 'string', format: 'uuid' }
          }
        }
      }
    },
    security: [{ bearerAuth: [] }]
  },
  apis: ['src/**/*.ts'],
};

const swaggerSpec = swaggerJsdoc(options);

export { swaggerUi, swaggerSpec };


