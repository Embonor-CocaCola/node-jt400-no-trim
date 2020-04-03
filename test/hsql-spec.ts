'use strict'
import { useInMemoryDb } from '../lib/jt400'
import { Readable } from 'stream'
import { parse } from 'JSONStream'
import { expect } from 'chai'

const jt400 = useInMemoryDb()
describe('hsql in memory', () => {
  beforeEach(() => {
    return jt400
      .update(
        'create table testtbl (ID DECIMAL(15, 0) GENERATED BY DEFAULT AS IDENTITY(START WITH 1234567891234), NAME VARCHAR(300), START DATE, STAMP TIMESTAMP, PRIMARY KEY(ID))'
      )
      .then(() =>
        jt400.update("insert into testtbl (NAME) values('Foo bar baz')")
      )
  })

  afterEach(() => {
    return jt400.update('drop table testtbl')
  })

  describe('query', () => {
    it('should be in memory', () => {
      expect(jt400.isInMemory()).to.equal(true)
    })

    it('should select form testtbl', async () => {
      const res = await jt400.query('select * from testtbl')
      expect(res.length).to.equal(1)
    })

    it('should use column alias when selecting', async () => {
      const res = await jt400.query<any>('select ID, NAME MYNAME from testtbl')
      expect(res[0]).to.have.property('MYNAME')
    })

    it('should query as stream', done => {
      const stream = jt400.createReadStream('select * from testtbl')
      const jsonStream = stream.pipe(parse([true]))
      const data: any[] = []

      jsonStream.on('data', row => {
        data.push(row)
      })

      jsonStream.on('end', () => {
        try {
          expect(data.length).to.equal(1)
          done()
        } catch (e) {
          done(e)
        }
      })

      stream.on('error', done)
    })

    it('should fail queryAsStream with oops error', done => {
      const sql = 'select * from testtbl'
      const params = ['a']
      const stream = jt400.createReadStream(sql, params)
      const jsonStream = stream.pipe(parse([true]))

      jsonStream.on('end', () => {
        stream.emit('error', new Error('wrong error'))
      })

      stream.on('error', err => {
        try {
          expect(err.message).to.equal(
            'Invalid argument in JDBC call: parameter index out of range: 1'
          )
          done()
        } catch (e) {
          done(e)
        }
      })
    })
  })

  describe('insert', () => {
    it('should insert and return id', async () => {
      const res = await jt400.insertAndGetId(
        'insert into testtbl (NAME) values(?)',
        ['foo']
      )
      expect(res).to.equal(1234567891235)
    })

    it('should insert list', async () => {
      const res = await jt400.insertList('testtbl', 'ID', [
        {
          NAME: 'foo'
        },
        {
          NAME: 'bar'
        }
      ])

      expect(res).to.eql([1234567891235, 1234567891236])

      const select = await jt400.query('select * from testtbl')
      expect(select.length).to.equal(3)
    })

    it('should insert date and timestamp', async () => {
      const ids = await jt400.insertList('testtbl', 'ID', [
        {
          START: new Date().toISOString().substr(0, 10),
          STAMP: new Date()
        }
      ])

      expect(ids).to.eql([1234567891235])
    })

    it('should create write stream', done => {
      const dataStream = new Readable({ objectMode: true })
      let c = 97
      dataStream._read = function() {
        dataStream.push([String.fromCharCode(c++)])
        if (c > 'z'.charCodeAt(0)) {
          dataStream.push(null)
        }
      }

      const ws = jt400.createWriteStream(
        'insert into testtbl (NAME) VALUES(?)',
        { bufferSize: 10 }
      )
      dataStream
        .pipe(ws)
        .on('finish', () => {
          jt400
            .query('select name from testtbl')
            .then(res => {
              expect(res.length).to.equal(27)
            })
            .then(done, done)
        })
        .on('error', done)
    })
  })

  describe('batch update', () => {
    it('should insert batch', async () => {
      const res = await jt400.batchUpdate(
        'insert into testtbl (NAME,START) values(?, ?)',
        [
          ['foo', '2015-01-02'],
          ['bar', '2015-03-04']
        ]
      )

      expect(res).to.eql([1, 1])
    })

    it('should fail insert batch with oops-error', () => {
      const sql = 'insert into testtbl (NAME,START) values(?, ?)'
      const params = [
        ['foo', '2015-01-02'],
        ['bar', '2015-03-04'],
        ['a', 'b', 'c', 'd']
      ]

      return jt400
        .batchUpdate(sql, params)
        .then(() => {
          throw new Error('wrong error')
        })
        .catch(error => {
          expect(error.message).to.equal(
            'data exception: invalid datetime format'
          )
          expect(error.cause.stack).to.include('JdbcJsonClient.setParams')
          expect(error.context.sql).to.equal(sql)
          expect(error.context.params).to.deep.equal(params)
          expect(error.category).to.equal('ProgrammerError')
        })
    })
  })

  describe('pgm call mock', () => {
    let callFoo
    let input

    beforeEach(() => {
      callFoo = jt400.defineProgram({
        programName: 'foo',
        paramsSchema: [
          {
            name: 'bar',
            size: 10
          },
          {
            name: 'baz',
            size: 9,
            decimals: 2
          }
        ]
      })

      input = {
        bar: 'a',
        baz: 10
      }
    })

    it('should return input by default', async () => {
      const res = await callFoo(input)
      expect(res).to.eql(input)
    })

    it('should register mock', async () => {
      jt400.mockPgm('foo', input => {
        input.baz = 20
        return input
      })

      const res = await callFoo(input)
      expect(res.baz).to.equal(20)
    })
  })

  describe('should mock ifs', () => {
    it('should get metadata', async () => {
      const metadata = await jt400.ifs().fileMetadata('/foo/bar.txt')
      expect(metadata).to.deep.equal({
        exists: false,
        length: 0
      })
    })
  })

  describe('execute', () => {
    it('should get metadata', async () => {
      const statement = await jt400.execute('select * from testtbl')
      const metadata = await statement.metadata()

      expect(metadata).to.eql([
        {
          name: 'ID',
          typeName: 'DECIMAL',
          precision: 15,
          scale: 0
        },
        {
          name: 'NAME',
          typeName: 'VARCHAR',
          precision: 300,
          scale: 0
        },
        {
          name: 'START',
          typeName: 'DATE',
          precision: 10,
          scale: 0
        },
        {
          name: 'STAMP',
          typeName: 'TIMESTAMP',
          precision: 26,
          scale: 6
        }
      ])
    })

    it('should get result as stream', done => {
      jt400.execute('select * from testtbl').then(statement => {
        const stream = statement.asStream()
        let data = ''
        expect(statement.isQuery()).to.equal(true)

        stream.on('data', chunk => {
          data += chunk
        })

        stream.on('end', () => {
          try {
            expect(data).to.equal('[["1234567891234","Foo bar baz",null,null]]')
            done()
          } catch (err) {
            done(err)
          }
        })

        stream.on('error', done)
      })
    })

    it('should get result as array', async () => {
      const statement = await jt400.execute('select * from testtbl')
      const data = await statement.asArray()
      expect(data).to.eql([['1234567891234', 'Foo bar baz', null, null]])
    })

    it('should pipe to JSONStream', done => {
      let i = 1
      const data: any[] = []

      while (i < 110) {
        data.push(i++)
      }

      data
        .reduce((memo, item) => {
          return memo.then(() =>
            jt400.update('insert into testtbl (NAME) values(?)', ['n' + item])
          )
        }, Promise.resolve())
        .then(() => jt400.execute('select NAME from testtbl order by ID'))
        .then(statement => statement.asStream().pipe(parse([true])))
        .then(stream => {
          const res: any[] = []
          stream.on('data', row => {
            res.push(row)
          })

          stream.on('end', () => {
            expect(res.length).to.equal(110)
            res.forEach((row, index) => {
              if (index > 0) {
                expect(row[0]).to.eql('n' + index)
              }
            })
            done()
          })

          stream.on('error', done)
        })
        .catch(done)
    })

    it('should get update count', async () => {
      const statement = await jt400.execute('update testtbl set NAME=?', [
        'testing'
      ])
      expect(statement.isQuery()).to.equal(false)
      const updated = await statement.updated()
      expect(updated).to.equal(1)
    })

    it('should close stream', done => {
      let i = 1
      const data: any[] = []

      while (i < 40) {
        data.push(i++)
      }

      Promise.all(
        data.map(item =>
          jt400.update('insert into testtbl (NAME) values(?)', ['n' + item])
        )
      )
        .then(() => {
          const res: any[] = []
          return jt400.execute('select NAME from testtbl').then(statement => {
            const stream = statement
              .asStream({
                bufferSize: 10
              })
              .pipe(parse([true]))

            stream.on('data', row => {
              res.push(row)
              if (res.length >= 10) {
                statement.close()
              }
            })

            stream.on('end', () => {
              expect(res.length).to.be.below(21)
              done()
            })

            stream.on('error', done)
          })
        })
        .catch(done)
    })
  })

  describe('metadata', () => {
    it('should return table metadata as stream', done => {
      const stream = jt400.getTablesAsStream({
        schema: 'PUBLIC'
      })

      const schema: any[] = []
      stream.on('data', data => {
        schema.push(data)
      })

      stream.on('end', () => {
        expect(schema).to.eql([
          {
            schema: 'PUBLIC',
            table: 'TESTTBL',
            remarks: ''
          }
        ])
        done()
      })

      stream.on('error', done)
    })

    it('should return columns', async () => {
      const res = await jt400.getColumns({
        schema: 'PUBLIC',
        table: 'TESTTBL'
      })

      expect(res).to.eql([
        {
          name: 'ID',
          typeName: 'DECIMAL',
          precision: 15,
          scale: 0
        },
        {
          name: 'NAME',
          typeName: 'VARCHAR',
          precision: 300,
          scale: 0
        },
        {
          name: 'START',
          typeName: 'DATE',
          precision: 10,
          scale: 0
        },
        {
          name: 'STAMP',
          typeName: 'TIMESTAMP',
          precision: 26,
          scale: 0
        }
      ])
    })

    it('should return primary key', async () => {
      const res = await jt400.getPrimaryKeys({
        table: 'TESTTBL'
      })

      expect(res.length).to.equal(1)
      expect(res[0].name).to.equal('ID')
    })
  })

  describe('transaction', () => {
    it('should commit', () => {
      let rowId
      return jt400
        .transaction(transaction => {
          return transaction
            .insertAndGetId(
              "insert into testtbl (NAME) values('Transaction 1')"
            )
            .then(res => {
              rowId = res
              return transaction.update(
                "update testtbl set NAME='Transaction 2' where id=?",
                [rowId]
              )
            })
        })
        .then(() =>
          jt400.query<any>('select NAME from testtbl where id=?', [rowId])
        )
        .then(res => {
          expect(res[0].NAME).to.eql('Transaction 2')
        })
    })

    it('should rollback', () => {
      const fakeError = new Error('fake error')
      let rowId
      return jt400
        .transaction(transaction => {
          return transaction
            .insertAndGetId(
              "insert into testtbl (NAME) values('Transaction 1')"
            )
            .then(res => {
              rowId = res
              throw fakeError
            })
        })
        .catch(err => {
          expect(err).to.equal(fakeError)
        })
        .then(() => jt400.query('select NAME from testtbl where id=?', [rowId]))
        .then(res => {
          expect(res.length).to.equal(0)
        })
    })

    it('should batch update', async () => {
      const res = await jt400.transaction(transaction => {
        return transaction.batchUpdate('insert into testtbl (NAME) values(?)', [
          ['Foo'],
          ['Bar']
        ])
      })
      expect(res).to.eql([1, 1])
    })
  })
})
