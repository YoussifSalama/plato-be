import * as fs from 'fs';
import * as path from 'path';

const schemas = [
    'datasource.prisma',
    'enum.prisma',
    'resume.prisma',
    'resume.ai.prisma',
    'agency.prisma',
    'job.prisma',
    'invitation.prisma',
    'inbox.prisma',
    'candidate.prisma',
    'interview.prisma',
    'application.prisma',
];
const schemasDir = path.join(__dirname, 'schemas');

function mergeSchemas(schemas: string[]) {
    const schemaContent = schemas
        .map(schema => {
            const content = fs.readFileSync(path.join(schemasDir, schema), 'utf8');
            return `// --- ${schema} ---\n${content.trimEnd()}`;
        })
        .join('\n\n');
    return schemaContent;
}

const mergedSchema = mergeSchemas(schemas);
fs.writeFile(path.join(__dirname, 'schema.prisma'), mergedSchema, (err) => {
    if (err) {
        console.error('Error writing merged schema:', err);
        process.exit(1);
    }
    console.log('Merged schema written successfully');
});