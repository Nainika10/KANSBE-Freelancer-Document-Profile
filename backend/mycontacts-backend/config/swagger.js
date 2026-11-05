const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'MyContacts Backend API',
            version: '1.0.0',
            description: 'API documentation for KansBe Freelancer Platform - connecting clients with freelancers',
            contact: {
                name: 'KansBe Support',
                email: 'support@kansbe.com'
            }
        },
        servers: [
            {
                url: 'https://kansbe.com',
                description: 'Development server'
            },
            {
                url: 'https://kansbe.com',
                description: 'Production server'
            }
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                    description: 'Enter your JWT token'
                }
            }
        },
        tags: [
            { name: 'Health', description: 'Health check endpoints' },
            { name: 'Freelancers', description: 'Freelancer user management' },
            { name: 'Clients', description: 'Client user management' },
            { name: 'Admin', description: 'Admin management (requires admin token)' },
            { name: 'Projects', description: 'Project management' },
            { name: 'Client Bank', description: 'Client banking details' },
            { name: 'Freelancer Bank', description: 'Freelancer banking details' },
            { name: 'Groups', description: 'Project group management' },
            { name: 'Chat', description: 'Project chat functionality' },
            { name: 'Client Notifications', description: 'Client notifications' },
            { name: 'Freelancer Notifications', description: 'Freelancer notifications' },
            { name: 'Contacts', description: 'Contact management' },
            { name: 'Client Info', description: 'Client information' },
            { name: 'Levels', description: 'Level management' },
            { name: 'Skill Mapping', description: 'Skill mapping' },
            { name: 'Tasks', description: 'Task management' },
            { name: 'Freelancer Profiles', description: 'Freelancer profile management' }
        ]
    },
    apis: ['./routes/*.js']  // Path to route files with JSDoc comments
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = { swaggerUi, swaggerSpec };
