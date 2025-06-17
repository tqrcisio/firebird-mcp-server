import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { z } from "zod";
import { FirebirdDB } from './db/firebird.js';
import { getFirebirdConfig } from './config/firebird.config.js';
import express, { Request, Response } from 'express';

const server = new McpServer({
    name: "FirebirdMcpServer",
    version: "1.0.0",
});

server.prompt("Enter the SQL query to be executed:", {
    query: z.string().describe("The SQL query to be executed (only read queries are allowed)")
}, async ({ query }, extra) => {
    return {
        messages: [{
            role: "assistant",
            content: {
                type: "text",
                text: `Query:\n${query}`
            }
        }]
    };
});

server.tool(
    "ping",
    {},
    async () => {
        try {
            const config = getFirebirdConfig();
            await FirebirdDB.query('SELECT 1 FROM RDB$DATABASE');

            return {
                content: [
                    {
                        type: "text",
                        text: `✅ Connection to Firebird established successfully!\nHost: ${config.host}\nDatabase: ${config.database}`
                    }
                ],
            };
        } catch (error) {
            return {
                content: [
                    {
                        type: "text",
                        text: `❌ Error connecting to Firebird:\n${error instanceof Error ? error.message : 'Unknown error'}`
                    }
                ],
            };
        }
    }
);

server.tool(
    "list_tables",
    {},
    async () => {
        try {
            const result = await FirebirdDB.query(`
        SELECT RDB$RELATION_NAME 
        FROM RDB$RELATIONS 
        WHERE RDB$SYSTEM_FLAG = 0 
        AND RDB$VIEW_BLR IS NULL
        ORDER BY RDB$RELATION_NAME
      `);

            const tables = result.map((row: any) => row.RDB$RELATION_NAME.trim());

            let output = 'Tables found in the Firebird database:\n\n';
            for (const table of tables) {
                output += `${table}\n`;
            }

            return {
                content: [
                    {
                        type: "text",
                        text: output
                    }
                ],
            };
        } catch (error) {
            return {
                content: [
                    {
                        type: "text",
                        text: `❌ Error listing tables:\n${error instanceof Error ? error.message : 'Unknown error'}`
                    }
                ],
            };
        }
    }
);

server.tool(
    "tables_details",
    {
        table_name: z.string().describe("Table name to get details"),
    },
    async ({ table_name }: { table_name: string }) => {
        try {

            const result = await FirebirdDB.query(`
        SELECT 
          RF.RDB$FIELD_NAME as COLUMN_NAME,
          F.RDB$FIELD_TYPE as DATA_TYPE,
          F.RDB$FIELD_LENGTH as FIELD_LENGTH,
          RF.RDB$NULL_FLAG as IS_NULLABLE,
          RF.RDB$DESCRIPTION as DESCRIPTION
        FROM RDB$RELATION_FIELDS RF
        JOIN RDB$FIELDS F ON RF.RDB$FIELD_SOURCE = F.RDB$FIELD_NAME
        WHERE RF.RDB$RELATION_NAME = ?
        ORDER BY RF.RDB$FIELD_POSITION
      `, [table_name]);

            if (result.length === 0) {
                return {
                    content: [
                        {
                            type: "text",
                            text: `❌ Table "${table_name}" not found.`
                        }
                    ],
                };
            }

            let output = `Table Details: ${table_name}\n`;
            output += '----------------------------------------\n\n';

            for (const row of result) {
                const columnName = row.COLUMN_NAME.trim();
                const isNullable = row.IS_NULLABLE === 1 ? 'NOT NULL' : 'NULL';
                const description = row.DESCRIPTION ? ` - ${row.DESCRIPTION.trim()}` : '';

                output += `${columnName} (${row.DATA_TYPE}, ${row.FIELD_LENGTH}) ${isNullable}${description}\n`;
            }

            return {
                content: [
                    {
                        type: "text",
                        text: output
                    }
                ],
            };
        } catch (error) {
            return {
                content: [
                    {
                        type: "text",
                        text: `❌ Error listing table details:\n${error instanceof Error ? error.message : 'Unknown error'}`
                    }
                ],
            };
        }
    }
);

server.tool(
    "execute_query",
    {
        query: z.string().describe("The SQL query to be executed (only read queries are allowed)"),
        limit: z.number().describe("The maximum number of rows to be returned").default(10),
    },
    async ({ query, limit }: { query: string, limit: number }) => {
        try {
            const forbiddenCommands = ['INSERT', 'UPDATE', 'DELETE', 'CREATE', 'ALTER', 'DROP', 'TRUNCATE'];
            const processedQuery = query.toUpperCase().replace(/^SELECT/i, `SELECT FIRST ${limit}`);
            if (forbiddenCommands.some(cmd => processedQuery.includes(cmd))) {
                throw new Error('Only read queries (SELECT) are allowed');
            }

            const result = await FirebirdDB.query(query, [limit]);

            return {
                content: [
                    {
                        type: "text",
                        text: `Query:\n${query}`
                    },
                    {
                        type: "text",
                        text: `Query result:\n${JSON.stringify(result, null, 2)}`
                    }
                ],
            };
        } catch (error) {
            return {
                content: [
                    {
                        type: "text",
                        text: `❌ Error executing query:\n${error instanceof Error ? error.message : 'Unknown error'}`
                    }
                ],
            };
        }
    }
);

server.tool(
    "search_columns",
    {
        table: z.string().describe("The table name to search columns").optional(),
        column: z.string().describe("The column name to search (can be partial)"),
    },
    async ({ table, column }: { table?: string, column: string }) => {
        try {
            const query = `
                SELECT 
                    rf.rdb$relation_name as table_name,
                    rf.rdb$field_name as column_name,
                    f.rdb$field_type as field_type,
                    f.rdb$field_length as field_length,
                    rf.rdb$description as description
                FROM rdb$relation_fields rf
                JOIN rdb$fields f ON rf.rdb$field_source = f.rdb$field_name
                WHERE rf.rdb$relation_name LIKE ?
                AND rf.rdb$field_name LIKE ?
                ORDER BY rf.rdb$relation_name, rf.rdb$field_position
            `;

            const result = await FirebirdDB.query(query, [table ? `%${table.toUpperCase()}%` : '%', `%${column.toUpperCase()}%`]);

            if (!result || result.length === 0) {
                return {
                    content: [
                        {
                            type: "text",
                            text: `No columns found with the specified criteria.`
                        }
                    ],
                };
            }

            return {
                content: [
                    {
                        type: "text",
                        text: `Query:\n${query}`
                    },
                    {
                        type: "text",
                        text: `Columns found:\n${JSON.stringify(result, null, 2)}`
                    }
                ],
            };
        } catch (error) {
            return {
                content: [
                    {
                        type: "text",
                        text: `❌ Error searching columns:\n${error instanceof Error ? error.message : 'Unknown error'}`
                    }
                ],
            };
        }
    }
);

async function startServer(transportType: "stdio" | "sse") {
    if (transportType === "stdio") {
        const transport = new StdioServerTransport();
        await server.connect(transport);
    } else if (transportType === "sse") {
        const app = express();
        let transport: SSEServerTransport | null = null;

        app.get("/sse", async (req: Request, res: Response) => {
            transport = new SSEServerTransport("/messages", res);
            await server.connect(transport);
        });

        app.post("/messages", async (req: Request, res: Response) => {
            if (transport) {
                await transport.handlePostMessage(req, res);
            }
        });

        app.listen(8765);
    }
}

const transportType = process.argv[2] === "sse" ? "sse" : "stdio";
startServer(transportType);