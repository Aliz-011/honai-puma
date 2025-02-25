import { BuildQueryResult, DBQueryConfig, ExtractTablesWithRelations } from 'drizzle-orm'
import * as schema from '@/db/schema'

type Schema = typeof schema
type TableWithRelations = ExtractTablesWithRelations<Schema>

export type IncludeRelation<TableName extends keyof TableWithRelations> =
    DBQueryConfig<'one' | 'many', boolean, TableWithRelations, TableWithRelations[TableName]>['with'];

export type IncludeColumns<TableName extends keyof TableWithRelations> =
    DBQueryConfig<'one' | 'many', boolean, TableWithRelations, TableWithRelations[TableName]>['columns'];

export type InferQueryModel<
    TableName extends keyof TableWithRelations,
    Columns extends keyof IncludeColumns<TableName> | undefined = undefined,
    With extends keyof IncludeRelation<TableName> | undefined = undefined
> = BuildQueryResult<TableWithRelations, TableWithRelations[TableName],
    {
        columns: Columns;
        with: With
    }>