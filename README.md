# Firebird MCP Server

A Model Context Protocol (MCP) server implementation for Firebird databases, providing seamless database integration and query capabilities.

## Features

- **Database Connection Management**: Secure connection handling with configurable parameters
- **Table Operations**: List tables and retrieve detailed schema information
- **Query Execution**: Execute read-only SQL queries with built-in safety measures
- **Connection Testing**: Ping functionality to verify database connectivity
- **Flexible Deployment**: Support for both STDIO and Server-Sent Events (SSE) modes

## Installation

```bash
pnpm install
```

## Usage

The Firebird MCP Server can be started in two different modes:

### 1. STDIO Mode (Standard Input/Output)

Ideal for direct integration with MCP clients:

```bash
pnpm start -- --host localhost --port 3050 --database /path/to/database.fdb --user SYSDBA --password masterkey
```

### 2. SSE Mode (Server-Sent Events)

Perfect for web-based applications and real-time updates:

```bash
pnpm start:sse -- --host localhost --port 3050 --database /path/to/database.fdb --user SYSDBA --password masterkey
```

## Configuration Parameters

Connection parameters can be provided via command-line arguments

| Parameter | Command Line | Required |
|-----------|--------------|----------|
| Host      | --host       | No       |
| Port      | --port       | No       |
| Database  | --database   | Yes      |
| User      | --user       | No       |
| Password  | --password   | Yes      |
| Role      | --role       | No       |


## Available Tools

The server provides the following MCP tools:

### 1. `ping`
Tests the database connection and verifies server availability.

**Usage**: No parameters required
**Returns**: Connection status and response time

### 2. `list_tables`
Retrieves a comprehensive list of all tables in the database.

**Usage**: No parameters required
**Returns**: Array of table names with metadata

### 3. `tables_details`
Provides detailed schema information for a specific table.

**Parameters**:
- `table_name` (string, required): Name of the table to inspect

**Returns**: Table structure including columns, data types, constraints, and indexes

### 4. `execute_query`
Executes read-only SQL queries with configurable result limits.

**Parameters**:
- `query` (string, required): SQL SELECT statement to execute
- `limit` (number, optional): Maximum number of rows to return (default: 10)

**Returns**: Query results with column metadata

**Security Note**: Only SELECT statements are permitted for security reasons.

## Security Considerations

- **Read-Only Operations**: Query execution is restricted to SELECT statements only
- **Parameter Validation**: All inputs are validated and sanitized
- **Connection Security**: Supports role-based access control
- **Error Handling**: Comprehensive error handling prevents information leakage

## Error Handling

The server includes robust error handling for:
- Invalid connection parameters
- Network connectivity issues
- SQL syntax errors
- Permission denied scenarios
- Database unavailability

## Contributing

Contributions are welcome! Please ensure all changes include:
- Comprehensive tests
- Updated documentation
- Security considerations
- Performance impact assessment

## Support

For issues and questions:
- Check the documentation
- Review existing issues
- Create a new issue with detailed information

---

**Note**: This MCP server is designed for development and testing purposes. For production use, ensure proper security measures, monitoring, and backup procedures are in place.