"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("./db");
const chai_1 = require("chai");
describe('keyed dataQ', () => {
    it('should read and write', (done) => {
        const dataQ = db_1.jt400.createKeyedDataQ({ name: 'SDQS1' });
        dataQ
            .read('mytestkey')
            .then((data) => {
            chai_1.expect(data).to.equal('ping');
        })
            .then(done, done);
        dataQ.write('mytestkey', 'ping');
    }).timeout(5000);
    it('should fail on timeout', (done) => {
        const dataQ = db_1.jt400.createKeyedDataQ({ name: 'SDQS1' });
        dataQ
            .read({ key: 'mytestkey', wait: 1 })
            .catch((err) => {
            chai_1.expect(err.message).to.contain('timeout, key: mytestkey');
        })
            .then(done, done);
    });
    it('should write to reponse', () => {
        const dataQ = db_1.jt400.createKeyedDataQ({ name: 'SDQS1' });
        dataQ
            .read({ key: 'mytestkey', wait: 1, writeKeyLength: 11 })
            .then((res) => {
            chai_1.expect(res.data).to.equal('ping');
            res.write('pong');
        })
            .catch((err) => {
            console.log('error reading data Q', err);
        });
        dataQ.write('mytestkey', 'returnkey  ping');
        return dataQ.read({ key: 'returnkey  ', wait: 10 }).then((data) => {
            chai_1.expect(data).to.equal('pong');
        });
    });
});
//# sourceMappingURL=dataq-spec.js.map