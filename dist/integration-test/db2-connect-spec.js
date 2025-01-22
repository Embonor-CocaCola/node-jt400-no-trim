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
const jt400_1 = require("../lib/jt400");
const chai_1 = require("chai");
describe('connect', () => {
    it('should connect', () => __awaiter(void 0, void 0, void 0, function* () {
        const db = yield jt400_1.connect();
        const nUpdated = yield db.update('delete from tsttbl');
        chai_1.expect(nUpdated).to.be.least(0);
    })).timeout(10000);
    it('should close', () => __awaiter(void 0, void 0, void 0, function* () {
        const db = yield jt400_1.connect();
        yield db.close();
        return db
            .update('delete from tsttbl')
            .then(() => {
            throw new Error('should not be connected');
        })
            .catch((err) => {
            chai_1.expect(err.message).to.equal('The connection does not exist.');
            chai_1.expect(err.category).to.equal('OperationalError');
        });
    })).timeout(6000);
});
//# sourceMappingURL=db2-connect-spec.js.map