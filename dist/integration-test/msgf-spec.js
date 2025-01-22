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
describe('MessageFileHandler', function () {
    return __awaiter(this, void 0, void 0, function* () {
        it('should open a message file and read an id', () => __awaiter(this, void 0, void 0, function* () {
            const file = yield db_1.jt400.openMessageFile({ path: '/QSYS.LIB/QCPFMSG.MSGF' });
            const msg = yield file.read({ messageId: 'CPF2105' });
            const expectedText = 'Object &1 in &2 type *&3 not found.';
            chai_1.expect(msg.getTextSync()).to.equal(expectedText);
            chai_1.expect(yield msg.getTextPromise()).to.equal(expectedText);
        })).timeout(5000);
    });
});
//# sourceMappingURL=msgf-spec.js.map