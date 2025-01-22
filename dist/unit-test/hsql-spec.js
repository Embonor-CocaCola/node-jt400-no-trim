'use strict';
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
Object.defineProperty(exports, "__esModule", { value: true });
const jt400_1 = require("../lib/jt400");
const stream_1 = require("stream");
const JSONStream_1 = require("JSONStream");
const chai_1 = require("chai");
const jt400 = jt400_1.useInMemoryDb();
describe('hsql in memory', () => {
    beforeEach(() => {
        return jt400
            .update('create table testtbl (ID DECIMAL(15, 0) GENERATED BY DEFAULT AS IDENTITY(START WITH 1234567891234), NAME VARCHAR(300), START DATE, STAMP TIMESTAMP, PRIMARY KEY(ID))')
            .then(() => jt400.update("insert into testtbl (NAME) values('Foo bar baz')"));
    });
    afterEach(() => {
        return jt400.update('drop table testtbl');
    });
    describe('query', () => {
        it('should be in memory', () => {
            chai_1.expect(jt400.isInMemory()).to.equal(true);
        });
        it('should select form testtbl', () => __awaiter(void 0, void 0, void 0, function* () {
            const res = yield jt400.query('select * from testtbl');
            chai_1.expect(res.length).to.equal(1);
        }));
        it('should use column alias when selecting', () => __awaiter(void 0, void 0, void 0, function* () {
            const res = yield jt400.query('select ID, NAME MYNAME from testtbl');
            chai_1.expect(res[0]).to.have.property('MYNAME');
        }));
        it('should query as stream', (done) => {
            const stream = jt400.createReadStream('select * from testtbl');
            const jsonStream = stream.pipe(JSONStream_1.parse([true]));
            const data = [];
            jsonStream.on('data', (row) => {
                data.push(row);
            });
            jsonStream.on('end', () => {
                try {
                    chai_1.expect(data.length).to.equal(1);
                    done();
                }
                catch (e) {
                    done(e);
                }
            });
            stream.on('error', done);
        });
        it('should fail queryAsStream with oops error', (done) => {
            const sql = 'select * from testtbl';
            const params = ['a'];
            const stream = jt400.createReadStream(sql, params);
            const jsonStream = stream.pipe(JSONStream_1.parse([true]));
            jsonStream.on('end', () => {
                stream.emit('error', new Error('wrong error'));
            });
            stream.on('error', (err) => {
                try {
                    chai_1.expect(err.message).to.equal('Invalid argument in JDBC call: parameter index out of range: 1');
                    done();
                }
                catch (e) {
                    done(e);
                }
            });
        });
    });
    describe('insert', () => {
        it('should insert and return id', () => __awaiter(void 0, void 0, void 0, function* () {
            const res = yield jt400.insertAndGetId('insert into testtbl (NAME) values(?)', ['foo']);
            chai_1.expect(res).to.equal(1234567891235);
        }));
        it('should insert list', () => __awaiter(void 0, void 0, void 0, function* () {
            const res = yield jt400.insertList('testtbl', 'ID', [
                {
                    NAME: 'foo',
                },
                {
                    NAME: 'bar',
                },
            ]);
            chai_1.expect(res).to.eql([1234567891235, 1234567891236]);
            const select = yield jt400.query('select * from testtbl');
            chai_1.expect(select.length).to.equal(3);
        }));
        it('should insert date and timestamp', () => __awaiter(void 0, void 0, void 0, function* () {
            const ids = yield jt400.insertList('testtbl', 'ID', [
                {
                    START: new Date().toISOString().substr(0, 10),
                    STAMP: new Date(),
                },
            ]);
            chai_1.expect(ids).to.eql([1234567891235]);
        }));
        it('should create write stream', (done) => {
            const dataStream = new stream_1.Readable({ objectMode: true });
            let c = 97;
            dataStream._read = function () {
                dataStream.push([String.fromCharCode(c++)]);
                if (c > 'z'.charCodeAt(0)) {
                    dataStream.push(null);
                }
            };
            const ws = jt400.createWriteStream('insert into testtbl (NAME) VALUES(?)', { bufferSize: 10 });
            dataStream
                .pipe(ws)
                .on('finish', () => {
                jt400
                    .query('select name from testtbl')
                    .then((res) => {
                    chai_1.expect(res.length).to.equal(27);
                })
                    .then(done, done);
            })
                .on('error', done);
        });
    });
    describe('batch update', () => {
        it('should insert batch', () => __awaiter(void 0, void 0, void 0, function* () {
            const res = yield jt400.batchUpdate('insert into testtbl (NAME,START) values(?, ?)', [
                ['foo', '2015-01-02'],
                ['bar', '2015-03-04'],
            ]);
            chai_1.expect(res).to.eql([1, 1]);
        }));
        it('should fail insert batch with oops-error', () => {
            const sql = 'insert into testtbl (NAME,START) values(?, ?)';
            const params = [
                ['foo', '2015-01-02'],
                ['bar', '2015-03-04'],
                ['a', 'b', 'c', 'd'],
            ];
            return jt400
                .batchUpdate(sql, params)
                .then(() => {
                throw new Error('wrong error');
            })
                .catch((error) => {
                chai_1.expect(error.message).to.equal('data exception: invalid datetime format');
                chai_1.expect(error.cause.stack).to.include('JdbcJsonClient.setParams');
                chai_1.expect(error.context.sql).to.equal(sql);
                chai_1.expect(error.context.params).to.deep.equal(params);
                chai_1.expect(error.category).to.equal('ProgrammerError');
            });
        });
    });
    describe('pgm call mock', () => {
        let callFoo;
        let input;
        beforeEach(() => {
            callFoo = jt400.defineProgram({
                programName: 'foo',
                paramsSchema: [
                    {
                        name: 'bar',
                        size: 10,
                    },
                    {
                        name: 'baz',
                        size: 9,
                        decimals: 2,
                    },
                ],
            });
            input = {
                bar: 'a',
                baz: 10,
            };
        });
        it('should return input by default', () => __awaiter(void 0, void 0, void 0, function* () {
            const res = yield callFoo(input);
            chai_1.expect(res).to.eql(input);
        }));
        it('should register mock', () => __awaiter(void 0, void 0, void 0, function* () {
            jt400.mockPgm('foo', (input) => {
                input.baz = 20;
                return input;
            });
            const res = yield callFoo(input);
            chai_1.expect(res.baz).to.equal(20);
        }));
    });
    describe('should mock ifs', () => {
        it('should get metadata', () => __awaiter(void 0, void 0, void 0, function* () {
            const metadata = yield jt400.ifs().fileMetadata('/foo/bar.txt');
            chai_1.expect(metadata).to.deep.equal({
                exists: false,
                length: 0,
            });
        }));
    });
    describe('execute', () => {
        it('should get metadata', () => __awaiter(void 0, void 0, void 0, function* () {
            const statement = yield jt400.execute('select * from testtbl');
            const metadata = yield statement.metadata();
            chai_1.expect(metadata).to.eql([
                {
                    name: 'ID',
                    typeName: 'DECIMAL',
                    precision: 15,
                    scale: 0,
                },
                {
                    name: 'NAME',
                    typeName: 'VARCHAR',
                    precision: 300,
                    scale: 0,
                },
                {
                    name: 'START',
                    typeName: 'DATE',
                    precision: 10,
                    scale: 0,
                },
                {
                    name: 'STAMP',
                    typeName: 'TIMESTAMP',
                    precision: 26,
                    scale: 6,
                },
            ]);
        }));
        it('should get result as stream', (done) => {
            jt400
                .execute('select * from testtbl')
                .then((statement) => {
                const stream = statement.asStream();
                let data = '';
                chai_1.expect(statement.isQuery()).to.equal(true);
                stream.on('data', (chunk) => {
                    data += chunk;
                });
                stream.on('end', () => {
                    try {
                        chai_1.expect(data).to.equal('[["1234567891234","Foo bar baz",null,null]]');
                        done();
                    }
                    catch (err) {
                        done(err);
                    }
                });
                stream.on('error', done);
            })
                .catch(done);
        });
        it('should get result as array', () => __awaiter(void 0, void 0, void 0, function* () {
            const statement = yield jt400.execute('select * from testtbl');
            const data = yield statement.asArray();
            chai_1.expect(data).to.eql([['1234567891234', 'Foo bar baz', null, null]]);
        }));
        it('should get result as iterable', () => __awaiter(void 0, void 0, void 0, function* () {
            var e_1, _a;
            const statement = yield jt400.execute('select * from testtbl');
            const rows = statement.asIterable();
            let count = 0;
            try {
                for (var rows_1 = __asyncValues(rows), rows_1_1; rows_1_1 = yield rows_1.next(), !rows_1_1.done;) {
                    const row = rows_1_1.value;
                    count++;
                    chai_1.expect(row).to.eql(['1234567891234', 'Foo bar baz', null, null]);
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (rows_1_1 && !rows_1_1.done && (_a = rows_1.return)) yield _a.call(rows_1);
                }
                finally { if (e_1) throw e_1.error; }
            }
            chai_1.expect(count).to.equal(1);
        }));
        it('should pipe to JSONStream', (done) => {
            let i = 1;
            const data = [];
            while (i < 110) {
                data.push(i++);
            }
            data
                .reduce((memo, item) => {
                return memo.then(() => jt400.update('insert into testtbl (NAME) values(?)', ['n' + item]));
            }, Promise.resolve())
                .then(() => jt400.execute('select NAME from testtbl order by ID'))
                .then((statement) => statement.asStream().pipe(JSONStream_1.parse([true])))
                .then((stream) => {
                const res = [];
                stream.on('data', (row) => {
                    res.push(row);
                });
                stream.on('end', () => {
                    chai_1.expect(res.length).to.equal(110);
                    res.forEach((row, index) => {
                        if (index > 0) {
                            chai_1.expect(row[0]).to.eql('n' + index);
                        }
                    });
                    done();
                });
                stream.on('error', done);
            })
                .catch(done);
        });
        it('should get update count', () => __awaiter(void 0, void 0, void 0, function* () {
            const statement = yield jt400.execute('update testtbl set NAME=?', [
                'testing',
            ]);
            chai_1.expect(statement.isQuery()).to.equal(false);
            const updated = yield statement.updated();
            chai_1.expect(updated).to.equal(1);
        }));
        it('should close stream', (done) => {
            let i = 1;
            const data = [];
            while (i < 40) {
                data.push(i++);
            }
            Promise.all(data.map((item) => jt400.update('insert into testtbl (NAME) values(?)', ['n' + item])))
                .then(() => {
                const res = [];
                return jt400.execute('select NAME from testtbl').then((statement) => {
                    const stream = statement
                        .asStream({
                        bufferSize: 10,
                    })
                        .pipe(JSONStream_1.parse([true]));
                    stream.on('data', (row) => {
                        res.push(row);
                        if (res.length >= 10) {
                            statement.close();
                        }
                    });
                    stream.on('end', () => {
                        chai_1.expect(res.length).to.be.below(21);
                        done();
                    });
                    stream.on('error', done);
                });
            })
                .catch(done);
        });
    });
    describe('metadata', () => {
        it('should return table metadata as stream', (done) => {
            const stream = jt400.getTablesAsStream({
                schema: 'PUBLIC',
            });
            const schema = [];
            stream.on('data', (data) => {
                schema.push(data);
            });
            stream.on('end', () => {
                chai_1.expect(schema).to.eql([
                    {
                        schema: 'PUBLIC',
                        table: 'TESTTBL',
                        remarks: '',
                    },
                ]);
                done();
            });
            stream.on('error', done);
        });
        it('should return columns', () => __awaiter(void 0, void 0, void 0, function* () {
            const res = yield jt400.getColumns({
                schema: 'PUBLIC',
                table: 'TESTTBL',
            });
            chai_1.expect(res).to.eql([
                {
                    name: 'ID',
                    typeName: 'DECIMAL',
                    precision: 15,
                    scale: 0,
                },
                {
                    name: 'NAME',
                    typeName: 'VARCHAR',
                    precision: 300,
                    scale: 0,
                },
                {
                    name: 'START',
                    typeName: 'DATE',
                    precision: 10,
                    scale: 0,
                },
                {
                    name: 'STAMP',
                    typeName: 'TIMESTAMP',
                    precision: 26,
                    scale: 0,
                },
            ]);
        }));
        it('should return primary key', () => __awaiter(void 0, void 0, void 0, function* () {
            const res = yield jt400.getPrimaryKeys({
                table: 'TESTTBL',
            });
            chai_1.expect(res.length).to.equal(1);
            chai_1.expect(res[0].name).to.equal('ID');
        }));
    });
    describe('transaction', () => {
        it('should commit', () => {
            let rowId;
            return jt400
                .transaction((transaction) => {
                return transaction
                    .insertAndGetId("insert into testtbl (NAME) values('Transaction 1')")
                    .then((res) => {
                    rowId = res;
                    return transaction.update("update testtbl set NAME='Transaction 2' where id=?", [rowId]);
                });
            })
                .then(() => jt400.query('select NAME from testtbl where id=?', [rowId]))
                .then((res) => {
                chai_1.expect(res[0].NAME).to.eql('Transaction 2');
            });
        });
        it('should rollback', () => {
            const fakeError = new Error('fake error');
            let rowId;
            return jt400
                .transaction((transaction) => {
                return transaction
                    .insertAndGetId("insert into testtbl (NAME) values('Transaction 1')")
                    .then((res) => {
                    rowId = res;
                    throw fakeError;
                });
            })
                .catch((err) => {
                chai_1.expect(err).to.equal(fakeError);
            })
                .then(() => jt400.query('select NAME from testtbl where id=?', [rowId]))
                .then((res) => {
                chai_1.expect(res.length).to.equal(0);
            });
        });
        it('should batch update', () => __awaiter(void 0, void 0, void 0, function* () {
            const res = yield jt400.transaction((transaction) => {
                return transaction.batchUpdate('insert into testtbl (NAME) values(?)', [
                    ['Foo'],
                    ['Bar'],
                ]);
            });
            chai_1.expect(res).to.eql([1, 1]);
        }));
    });
});
//# sourceMappingURL=hsql-spec.js.map