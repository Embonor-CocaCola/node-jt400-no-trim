/// <reference types="node" />
import { Readable, Writable } from 'stream';
export interface ProgramDefinitionOptions {
    programName: string;
    paramsSchema: PgmParamType[];
    libraryName?: string;
    ccsid?: number;
}
export interface WriteStreamOptions {
    bufferSize: number;
}
export interface PgmParamType1 {
    name: string;
    size: number;
    type?: string;
    decimals?: number;
}
export interface PgmParamType2 {
    name: string;
    precision: number;
    typeName?: string;
    scale?: number;
}
export interface PgmParamStructType {
    [key: string]: PgmParamType[];
}
export declare type PgmParamType = PgmParamType1 | PgmParamType2 | PgmParamStructType;
export interface CLOB {
    type: 'CLOB';
    value: string;
}
export interface BLOB {
    type: 'BLOB';
    value: string;
}
export declare type Param = string | number | Date | null | CLOB | BLOB;
export interface JustNameMessageQ {
    name: string;
}
export interface JustPathMessageQ {
    path: string;
}
export declare type MessageQOptions = JustNameMessageQ | JustPathMessageQ;
export interface MessageQReadOptions {
    wait?: number;
}
export interface DataQReadOptions {
    key: string;
    wait?: number;
    writeKeyLength?: number;
}
export interface MessageFileHandlerOptions {
    path: string;
}
export interface MessageFileReadOptions {
    messageId: string[7];
}
export interface MessageQ {
    sendInformational: (messageText: string) => Promise<void>;
    read: (params?: MessageQReadOptions) => Promise<any> | Promise<null>;
}
export interface DataQOptions {
    name: string;
}
export interface KeyedDataQ {
    write: (key: string, data: string) => void;
    read: (params: DataQReadOptions | string) => Promise<any>;
}
export interface AS400Message {
    getText: (cb: (err: any, data: string) => void) => void;
    getTextSync: () => string;
    getTextPromise: () => Promise<string>;
}
export interface MessageFileHandler {
    read: (params: MessageFileReadOptions) => Promise<AS400Message>;
}
export interface IfsFileMetadata {
    exists: boolean;
    length: number;
}
export interface Ifs {
    createReadStream: (fileName: string | Promise<string>) => Readable;
    createWriteStream: (fileName: string | Promise<string>, options?: {
        append: boolean;
        ccsid?: number;
    }) => Writable;
    deleteFile: (fileName: string) => Promise<boolean>;
    fileMetadata: (fileName: string) => Promise<IfsFileMetadata>;
}
export interface QueryOptions {
    trim: Boolean;
}
export interface Metadata {
    name: string;
    typeName: string;
    precision: number;
    scale: number;
}
export interface Statement {
    isQuery: () => boolean;
    metadata: () => Promise<Metadata[]>;
    asArray: () => Promise<string[][]>;
    asIterable: () => AsyncIterable<string[]>;
    asStream: (options?: any) => Readable;
    updated: () => Promise<number>;
    close: Close;
}
export declare type Execute = (sql: string, params?: Param[]) => Promise<Statement>;
export declare type Query = <T>(sql: string, params?: Param[], options?: QueryOptions) => Promise<T[]>;
export declare type Update = (sql: string, params?: Param[]) => Promise<number>;
export declare type CreateReadStream = (sql: string, params?: Param[]) => Readable;
export declare type InsertAndGetId = (sql: string, params?: Param[]) => Promise<number>;
export declare type CreateWriteStream = (sql: string, options?: WriteStreamOptions) => Writable;
export declare type BatchUpdate = (sql: string, params?: Param[][]) => Promise<number[]>;
export declare type Close = () => void;
export declare type InsertList = (tableName: string, idColumn: string, rows: any[]) => Promise<number[]>;
export interface BaseConnection {
    query: Query;
    update: Update;
    isInMemory: () => boolean;
    createReadStream: CreateReadStream;
    insertAndGetId: InsertAndGetId;
    insertList: InsertList;
    createWriteStream: CreateWriteStream;
    batchUpdate: (sql: string, params?: Param[][]) => Promise<number[]>;
    execute: Execute;
    close: Close;
}
export declare type TransactionFun = (transaction: BaseConnection) => Promise<any>;
export interface Connection extends BaseConnection {
    pgm: (programName: string, paramsSchema: PgmParamType[], libraryName?: string) => any;
    defineProgram: (options: ProgramDefinitionOptions) => any;
    getTablesAsStream: (params: any) => Readable;
    getColumns: (params: any) => any;
    getPrimaryKeys: (params: any) => any;
    transaction: (fn: TransactionFun) => Promise<any>;
    openMessageQ: (params: MessageQOptions) => Promise<MessageQ>;
    createKeyedDataQ: (params: DataQOptions) => KeyedDataQ;
    openMessageFile: (params: MessageFileHandlerOptions) => Promise<MessageFileHandler>;
    ifs: () => Ifs;
}
export interface InMemoryConnection extends Connection {
    mockPgm: (programName: string, fn: (input: any) => any) => InMemoryConnection;
}
export declare function pool(config?: any): Connection;
export declare function connect(config?: any): any;
export declare function useInMemoryDb(): InMemoryConnection;
