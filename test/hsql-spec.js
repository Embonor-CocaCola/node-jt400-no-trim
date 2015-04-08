'use strict';
var jt400 = require('../lib/jt400').useInMemoryDb(),
    JSONStream = require('JSONStream'),
    q = require('q'),
    expect = require('chai').expect;

describe('hsql in memory', function() {

    beforeEach(function(done) {
        jt400.update('create table testtbl (ID DECIMAL(15, 0) GENERATED BY DEFAULT AS IDENTITY(START WITH 1234567891234), NAME VARCHAR(300), START DATE, STAMP TIMESTAMP, PRIMARY KEY(ID))')
            .then(function() {
                return jt400.update('insert into testtbl (NAME) values(\'Foo bar baz\')');
            })
            .then(function() {
                done();
            })
            .fail(done);
    });

    afterEach(function(done) {
        jt400.update('drop table testtbl')
            .then(function() {
                done();
            })
            .fail(done);
    });

    describe('query', function() {
        it('should be in memory', function () {
            expect(jt400.isInMemory()).to.be.true();
        });
        it('should select form testtbl', function(done) {
            jt400.query('select * from testtbl')
                .then(function(res) {
                    expect(res.length).to.equal(1);
                    done();
                })
                .fail(done);
        });

        it('should use column alias when selecting', function() {
            jt400.query('select ID, NAME MYNAME from testtbl')
                .then(function(res) {
                    expect(res[0].MYNAME).to.exist();
                });
        });

    });

    describe('insert', function() {
        it('should insert and return id', function(done) {
            jt400.insertAndGetId('insert into testtbl (NAME) values(?)', ['foo'])
                .then(function(res) {
                    expect(res).to.equal(1234567891235);
                    done();
                })
                .fail(done);
        });

        it('should insert list', function(done) {
            jt400.insertList('testtbl', 'ID', [{
                    NAME: 'foo'
                }, {
                    NAME: 'bar'
                }])
                .then(function(res) {
                    expect(res).to.eql([1234567891235, 1234567891236]);
                    return jt400.query('select * from testtbl');
                })
                .then(function(res) {
                    expect(res.length).to.equal(3);
                    done();
                })
                .fail(done);
        });


        it('should insert date and timestamp', function(done) {
            jt400.insertList('testtbl', 'ID', [{
                    START: new Date().toISOString().substr(0, 10),
                    STAMP: new Date()
                }]).then(function() {
                    done();
                })
                .fail(done);
        });

    });

    describe('batch update', function () {
        it('should insert batch', function (done) {
            jt400.batchUpdate('insert into testtbl (NAME,START) values(?, ?)', [
                ['foo', '2015-01-02'],
                ['bar', '2015-03-04']
            ])
            .then(function (res) {
                expect(res).to.eql([1, 1]);
            }).then(done, done);
        });
    });
    it('should mock pgm call', function(done) {
        var callFoo = jt400.pgm('foo', {
                name: 'bar',
                size: 10
            }, {
                name: 'baz',
                size: 9,
                decimals: 2
            }),
            input = {
                bar: 'a',
                baz: 10
            };
        callFoo(input).then(function(res) {
                expect(res).to.eql(input);
                done();
            })
            .fail(done);
    });

    describe('execute', function () {
        it('should get metadata', function (done) {
            jt400.execute('select * from testtbl').then(function (statement) {
                return statement.metadata();
            }).then(function (metadata) {
                expect(metadata).to.eql([{
                    name: 'ID',
                    typeName: 'DECIMAL',
                    precision: 15,
                    scale: 0
                }, {
                    name: 'NAME',
                    typeName: 'VARCHAR',
                    precision: 300,
                    scale: 0
                }, {
                    name: 'START',
                    typeName: 'DATE',
                    precision: 10,
                    scale: 0
                }, {
                    name: 'STAMP',
                    typeName: 'TIMESTAMP',
                    precision: 26,
                    scale: 6
                }]);
            }).then(done, done);
        });

        it('should get result as stream', function(done) {
            jt400.execute('select * from testtbl').then(function (statement) {
                var stream = statement.asStream(),
                    data = '';
                expect(statement.isQuery()).to.be.true();
                stream.on('data', function (chunk) {
                    data += chunk;
                });

                stream.on('end', function () {
                    expect(data).to.equal('[["1234567891234","Foo bar baz",null,null]]');
                    done();
                });
                stream.on('error', done);
            });
        });

        it('should pipe to JSONStream', function(done) {
            var i = 1,
                data = [];
            while (i < 110) {
                data.push(i++);
            }
            data.reduce(function(memo, item) {
                    return memo.then(function() {
                        return jt400.update('insert into testtbl (NAME) values(?)', ['n' + item]);
                    });
                }, q()).then(function() {
                    jt400.execute('select NAME from testtbl order by ID').then(function (statement) {
                        return statement.asStream().pipe(JSONStream.parse([true]));
                    }).then(function (stream) {
                        var res = [];
                        stream.on('data', function(row) {
                            res.push(row);
                        });
                        stream.on('end', function() {
                            expect(res.length).to.equal(110);
                            res.forEach(function(row, index) {
                                if (index > 0) {
                                    expect(row[0]).to.eql('n' + index);
                                }
                            });
                            done();
                        });
                        stream.on('error', done);
                    });
                })
                .fail(done);
        });

        it('should get update count', function(done) {
            jt400.execute('update testtbl set NAME=?', ['testing']).then(function(statement) {
              expect(statement.isQuery()).to.be.false();
              return statement.updated();
            }).then(function(updated) {
              expect(updated).to.equal(1);
            }).then(done, done);
        });

        it('should close stream', function(done) {
            var i = 1,
                data = [];
            while (i < 40) {
                data.push(i++);
            }
            q.all(data.map(function(item) {
                    return jt400.update('insert into testtbl (NAME) values(?)', ['n' + item]);
                })).then(function() {
                    var res = [];
                    return jt400.execute('select NAME from testtbl').then(function (statement) {
                        var stream = statement.asStream({bufferSize: 10}).pipe(JSONStream.parse([true]));
                        stream.on('data', function(row) {
                            res.push(row);
                            if (res.length >= 10) {
                                statement.close();
                            }
                        });
                        stream.on('end', function() {
                            expect(res.length).to.be.below(21);
                            done();
                        });
                        stream.on('error', done);
                    });
                })
                .fail(done);
        });
    });

    describe('metadata', function() {
        it('should return table metadata as stream', function(done) {
            var stream = jt400.getTablesAsStream({
                    schema: 'PUBLIC'
                }),
                schema = [];
            stream.on('data', function(data) {
                schema.push(data);
            });
            stream.on('end', function() {
                expect(schema).to.eql([{
                    schema: 'PUBLIC',
                    table: 'TESTTBL',
                    remarks: ''
                }]);
                done();
            });
            stream.on('error', done);
        });

        it('should return columns', function(done) {
            jt400.getColumns({
                    schema: 'PUBLIC',
                    table: 'TESTTBL'
                })
                .then(function(res) {
                    expect(res).to.eql([{
                        name: 'ID',
                        typeName: 'DECIMAL',
                        precision: 15,
                        scale: 0
                    }, {
                        name: 'NAME',
                        typeName: 'VARCHAR',
                        precision: 300,
                        scale: 0
                    }, {
                        name: 'START',
                        typeName: 'DATE',
                        precision: 10,
                        scale: 0
                    }, {
                        name: 'STAMP',
                        typeName: 'TIMESTAMP',
                        precision: 26,
                        scale: 0
                    }]);
                    done();
                }).fail(done);
        });

        it('should return primary key', function (done) {
            jt400.getPrimaryKeys({table: 'TESTTBL'}).then(function (res) {
                expect(res.length).to.equal(1);
                expect(res[0].name).to.equal('ID');
            }).then(done, done);
        });
    });

    describe('transaction', function() {
        it('should commit', function(done) {
            var rowId;
            jt400.transaction(function(transaction) {
                    return transaction.insertAndGetId("insert into testtbl (NAME) values('Transaction 1')")
                        .then(function(res) {
                            rowId = res;
                            return transaction.update("update testtbl set NAME='Transaction 2' where id=?", [rowId]);
                        });
                })
                .then(function() {
                    return jt400.query('select NAME from testtbl where id=?', [rowId]);
                })
                .then(function(res) {
                    expect(res[0].NAME).to.eql('Transaction 2');
                    done();
                })
                .fail(done);

        });

        it('should rollback', function(done) {
            var fakeError = new Error('fake error'),
                rowId;
            jt400.transaction(function(transaction) {
                    return transaction.insertAndGetId("insert into testtbl (NAME) values('Transaction 1')")
                        .then(function(res) {
                            rowId = res;
                            throw fakeError;
                        });
                })
                .fail(function(err) {
                    expect(err).to.equal(fakeError);
                })
                .then(function() {
                    return jt400.query('select NAME from testtbl where id=?', [rowId]);
                })
                .then(function(res) {
                    expect(res.length).to.equal(0);
                    done();
                })
                .fail(done);
        });
    });
});
