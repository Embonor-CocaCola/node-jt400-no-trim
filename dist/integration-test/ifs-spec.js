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
const streamEqual = require("stream-equal");
const { ifs } = db_1.jt400;
describe('ifs', () => {
    it('should read file', (done) => {
        const stream = ifs().createReadStream('/atm/test/hello_world.txt');
        let data = '';
        stream.on('data', (chunk) => {
            data += chunk;
        });
        stream.on('end', () => {
            chai_1.expect(data).to.equal('Halló heimur!\n');
            done();
        });
        stream.on('error', done);
    }).timeout(50000);
    it('should get file metadata', () => __awaiter(void 0, void 0, void 0, function* () {
        const metadata = yield ifs().fileMetadata('/atm/test/hello_world.txt');
        chai_1.expect(metadata).to.deep.equal({
            exists: true,
            length: 15,
        });
    }));
    it('should get metadata for file that does not exists', () => __awaiter(void 0, void 0, void 0, function* () {
        const metadata = yield ifs().fileMetadata('/atm/test/___file_that_does_not_exists____.txt');
        chai_1.expect(metadata).to.deep.equal({
            exists: false,
            length: 0,
        });
    }));
    it('should read filename promise', (done) => {
        const stream = ifs().createReadStream(Promise.resolve('/atm/test/hello_world.txt'));
        let data = '';
        stream.on('data', (chunk) => {
            data += chunk;
        });
        stream.on('end', () => {
            chai_1.expect(data).to.equal('Halló heimur!\n');
            done();
        });
        stream.on('error', done);
    }).timeout(50000);
    it('should write file', (done) => {
        const rs = ifs().createReadStream('/atm/test/hello_world.txt');
        const ws = ifs().createWriteStream('/atm/test2/new_file.txt', {
            append: false,
        });
        rs.pipe(ws)
            .on('finish', () => {
            const stream = ifs().createReadStream('/atm/test2/new_file.txt');
            let data = '';
            stream.on('data', (chunk) => {
                data += chunk;
            });
            stream.on('end', () => {
                chai_1.expect(data).to.equal('Halló heimur!\n');
                done();
            });
            stream.on('error', done);
        })
            .on('error', done);
    }).timeout(50000);
    it('should pipe image', () => {
        const rs = ifs().createReadStream('/atm/test/image.jpg');
        const ws = ifs().createWriteStream('/atm/test2/image.jpg', {
            append: false,
        });
        rs.pipe(ws).on('finish', () => {
            const oldImage = ifs().createReadStream('/atm/test/image.jpg');
            const newImage = ifs().createReadStream('/atm/test2/image.jpg');
            return streamEqual(oldImage, newImage).then((equal) => {
                chai_1.expect(equal).to.be.equal(true);
            });
        });
    }).timeout(50000);
});
//# sourceMappingURL=ifs-spec.js.map