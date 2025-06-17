import { z } from 'zod';

const firebirdConfigSchema = z.object({
    host: z.string(),
    port: z.number(),
    database: z.string(),
    user: z.string(),
    password: z.string(),
    lowercase_keys: z.boolean().default(false),
    role: z.string().optional(),
    pageSize: z.number().default(4096)
});

export type FirebirdConfig = z.infer<typeof firebirdConfigSchema>;

function parseArguments(): Partial<FirebirdConfig> {
    const args = process.argv.slice(2);
    const config: Partial<FirebirdConfig> = {};

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (arg.startsWith('--')) {
            const key = arg.slice(2) as keyof FirebirdConfig;
            const value = args[i + 1];
            if (value && !value.startsWith('--')) {
                if (key === 'port') {
                    config[key] = parseInt(value) as FirebirdConfig[typeof key];
                } else if (key === 'lowercase_keys') {
                    config[key] = value === 'true';
                } else if (key === 'pageSize') {
                    config[key] = parseInt(value) as FirebirdConfig[typeof key];
                } else {
                    config[key] = value as FirebirdConfig[typeof key];
                }
                i++;
            }
        }
    }

    return config;
}

export function getFirebirdConfig(): FirebirdConfig {
    const argsConfig = parseArguments();

    try {
        return firebirdConfigSchema.parse({
            host: argsConfig.host,
            port: argsConfig.port,
            database: argsConfig.database,
            user: argsConfig.user,
            password: argsConfig.password,
            role: argsConfig.role,
            lowercase_keys: false,
            pageSize: 4096
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            console.error('Error on Firebird configuration:');
            error.errors.forEach(err => {
                console.error(`- ${err.path.join('.')}: ${err.message}`);
            });
        }
        throw new Error('Invalid Firebird configuration:');
    }
} 