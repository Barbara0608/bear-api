import { Logger } from '@nestjs/common';
import { EventEmitter } from 'events';
import { NextFunction, Request, Response } from 'express';
import { RequestLoggerMiddleware } from './request-logger.middleware';

describe('RequestLoggerMiddleware', () => {
  let middleware: RequestLoggerMiddleware;
  let log: jest.SpyInstance;
  let warn: jest.SpyInstance;
  let error: jest.SpyInstance;

  beforeEach(() => {
    middleware = new RequestLoggerMiddleware();
    log = jest
      .spyOn(Logger.prototype, 'log')
      .mockImplementation(() => undefined);
    warn = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);
    error = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
  });

  afterEach(() => jest.restoreAllMocks());

  function handle(statusCode: number): jest.Mock {
    const req = { method: 'POST', originalUrl: '/bears' } as Request;
    const res = Object.assign(new EventEmitter(), {
      statusCode,
    }) as unknown as Response;
    const next = jest.fn();

    middleware.use(req, res, next as NextFunction);
    res.emit('finish');
    return next;
  }

  it('calls next and logs successful requests', () => {
    const next = handle(201);

    expect(next).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenCalledWith(
      expect.stringMatching(/^POST \/bears 201 \d+\.\dms$/),
    );
  });

  it('logs client errors as warnings', () => {
    handle(404);

    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('POST /bears 404'),
    );
    expect(log).not.toHaveBeenCalled();
  });

  it('logs server errors as errors', () => {
    handle(500);

    expect(error).toHaveBeenCalledWith(
      expect.stringContaining('POST /bears 500'),
    );
  });
});
