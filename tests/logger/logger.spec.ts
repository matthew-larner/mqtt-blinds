import { expect } from "chai";
import * as sinon from "sinon";
import * as logger from "../../src/lib/logger/logger";

describe("Logger test", () => {
  const consoleLogInfoStub = sinon.stub();
  const consoleLogWarnStub = sinon.stub();
  const consoleLogErrorStub = sinon.stub();

  beforeEach(function () {
    sinon.replace(console, "info", consoleLogInfoStub);
    sinon.replace(console, "warn", consoleLogWarnStub);
    sinon.replace(console, "error", consoleLogErrorStub);
  });

  afterEach(function () {
    sinon.restore();
  });

  it("should log info message correctly", async () => {
    logger.info("Test info message");
    expect(consoleLogInfoStub.called).to.be.true;
    expect(consoleLogInfoStub.args[0]).to.contain(
      '[INFO]: {\n    "Message": "Test info message"\n}'
    );
  });

  it("should log warn message correctly", async () => {
    logger.warn("Test warn message");
    expect(consoleLogWarnStub.called).to.be.true;
    expect(consoleLogWarnStub.args[0]).to.contain(
      '[WARN]: {\n    "Message": "Test warn message"\n}'
    );
  });

  it("should log error message correctly", async () => {
    logger.error("Test error message");
    expect(consoleLogErrorStub.called).to.be.true;
    expect(consoleLogErrorStub.args[0]).to.contain(
      '[ERROR]: {\n    "Message": "Test error message"\n}'
    );
  });

  it("should log message in a correct format when the message is an object", async () => {
    logger.info({ Message: "This is an object" });
    expect(consoleLogInfoStub.called).to.be.true;
    expect(consoleLogInfoStub.args[0]).to.contain(
      '[INFO]: {\n    "Message": "Test info message"\n}'
    );
  });
});
