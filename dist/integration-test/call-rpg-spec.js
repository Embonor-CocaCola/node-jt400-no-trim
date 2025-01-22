"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("./db");
const chai_1 = require("chai");
describe('PGM', () => {
    it('should run rpg program', () => __awaiter(void 0, void 0, void 0, function* () {
        const getIsk = db_1.jt400.defineProgram({
            programName: 'GET_ISK',
            paramsSchema: [{ name: 'mynt', size: 3 }],
        });
        const result = yield Promise.all([
            getIsk({ mynt: 'Kr.' }),
            getIsk({ mynt: 'EUR' }),
        ]);
        chai_1.expect(result[0].mynt).to.equal('ISK');
        chai_1.expect(result[1].mynt).to.equal('EUR');
    })).timeout(15000);
    it('should run GETNETFG', () => __awaiter(void 0, void 0, void 0, function* () {
        const getNetfang = db_1.jt400.defineProgram({
            programName: 'GETNETFG',
            paramsSchema: [
                { name: 'kt', size: 10, decimals: 0 },
                { name: 'email', size: 30 },
                { name: 'valid', size: 1 },
            ],
        });
        const result = yield getNetfang({ kt: '0123456789' });
        chai_1.expect(result.valid).to.equal('J');
    }));
    it('should run pgm with datastructure param', () => __awaiter(void 0, void 0, void 0, function* () {
        const tstDs = db_1.jt400.defineProgram({
            programName: 'TST_DS',
            paramsSchema: [
                {
                    p1: [
                        { name: 'txt1', size: 3 },
                        { name: 'num1', size: 9, decimals: 0 },
                        { name: 'num2', type: 'numeric', size: 9, decimals: 0 },
                    ],
                },
            ],
        });
        const result = yield tstDs({ p1: { txt1: 'tst', num1: 400, num2: 7 } });
        chai_1.expect(result.p1.txt1).to.equal('tst');
        chai_1.expect(result.p1.num1).to.equal(401);
        chai_1.expect(result.p1.num2).to.equal(8);
    }));
    it('should run pgm with datastructure param with columns format', () => __awaiter(void 0, void 0, void 0, function* () {
        const tstDs = db_1.jt400.defineProgram({
            programName: 'TST_DS',
            paramsSchema: [
                {
                    p1: [
                        { name: 'txt1', typeName: 'VARCHAR', precision: 3, scale: 0 },
                        { name: 'num1', typeName: 'DECIMAL', precision: 9, scale: 0 },
                        { name: 'num2', typeName: 'NUMERIC', precision: 9, scale: 0 },
                    ],
                },
            ],
        });
        const result = yield tstDs({ p1: { txt1: 'tst', num1: 400, num2: 7 } });
        chai_1.expect(result.p1.txt1).to.equal('tst');
        chai_1.expect(result.p1.num1).to.equal(401);
        chai_1.expect(result.p1.num2).to.equal(8);
    }));
    it('should get timeout errors', () => {
        const brokenProgram = db_1.jt400.pgm('DTQHANG', [{ name: 'strengur', size: 7 }], 'WTMEXC');
        return brokenProgram({ strengur: 'abcd123' })
            .then(() => {
            throw new Error('Not the correct error');
        })
            .catch((e) => {
            chai_1.expect(e.category).to.equal('OperationalError');
            chai_1.expect(e).not.to.equal(null);
            chai_1.expect(e.message).to.contain('Connection was dropped unexpectedly.');
        });
    });
});
//# sourceMappingURL=call-rpg-spec.js.map