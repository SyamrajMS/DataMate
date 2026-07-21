import psycopg2
import mysql.connector

def introspect_postgres(host, port, db_name, username, password) -> str:
    """Connects to PostgreSQL, extracts schema, and formats as markdown."""
    conn = psycopg2.connect(
        host=host,
        port=port,
        dbname=db_name,
        user=username,
        password=password,
        connect_timeout=10
    )
    cursor = conn.cursor()

    cursor.execute("""
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
    """)
    tables = [row[0] for row in cursor.fetchall()]

    schema_md = []
    
    for table in tables:
        schema_md.append(f"### {table}")
        schema_md.append("| Column | Type | Constraint |")
        schema_md.append("|--------|------|------------|")
        
        cursor.execute("""
            SELECT column_name, data_type, character_maximum_length, is_nullable
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = %s
            ORDER BY ordinal_position;
        """, (table,))
        
        for col in cursor.fetchall():
            col_name, data_type, max_len, is_nullable = col
            type_str = data_type
            if max_len:
                type_str += f"({max_len})"
            
            constraint = ""
            if is_nullable == 'NO':
                constraint = "NOT NULL"
                
            schema_md.append(f"| {col_name} | {type_str} | {constraint} |")
        schema_md.append("\n")
        
    conn.close()
    return "\n".join(schema_md)

def introspect_mysql(host, port, db_name, username, password) -> str:
    """Connects to MySQL, extracts schema, and formats as markdown."""
    conn = mysql.connector.connect(
        host=host,
        port=port,
        database=db_name,
        user=username,
        password=password,
        connection_timeout=10
    )
    cursor = conn.cursor()

    cursor.execute("SHOW TABLES")
    tables = [row[0] for row in cursor.fetchall()]

    schema_md = []
    
    for table in tables:
        schema_md.append(f"### {table}")
        schema_md.append("| Column | Type | Constraint |")
        schema_md.append("|--------|------|------------|")
        
        cursor.execute(f"DESCRIBE `{table}`")
        for col in cursor.fetchall():
            col_name, col_type, null, key, default, extra = col
            constraint = []
            if key == 'PRI': constraint.append('PRIMARY KEY')
            if key == 'MUL': constraint.append('INDEX')
            if null == 'NO': constraint.append('NOT NULL')
            
            schema_md.append(f"| {col_name} | {col_type} | {', '.join(constraint)} |")
        schema_md.append("\n")
        
    conn.close()
    return "\n".join(schema_md)

def introspect_db(db_type: str, host: str, port: int, db_name: str, username: str, password: str) -> str:
    """Router for database introspection."""
    if db_type == 'postgresql':
        return introspect_postgres(host, port, db_name, username, password)
    elif db_type == 'mysql':
        return introspect_mysql(host, port, db_name, username, password)
    else:
        raise ValueError(f"Unsupported database type: {db_type}")

def execute_custom_query(db_type: str, host: str, port: int, db_name: str, username: str, password: str, sql: str) -> list[dict]:
    """Executes a read-only query against the custom database."""
    if db_type == 'postgresql':
        conn = psycopg2.connect(host=host, port=port, dbname=db_name, user=username, password=password, connect_timeout=5)
        cursor = conn.cursor()
        cursor.execute(sql)
        columns = [desc[0] for desc in cursor.description]
        rows = cursor.fetchall()
        conn.close()
        return [dict(zip(columns, row)) for row in rows]
    elif db_type == 'mysql':
        conn = mysql.connector.connect(host=host, port=port, database=db_name, user=username, password=password, connection_timeout=5)
        cursor = conn.cursor(dictionary=True)
        cursor.execute(sql)
        rows = cursor.fetchall()
        conn.close()
        return rows
    else:
        raise ValueError(f"Unsupported database type: {db_type}")
