import {
  ArgumentsHost,
  BadRequestException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { AllExceptionsFilter } from './all-exceptions.filter';

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;
  let response: { status: jest.Mock; json: jest.Mock };
  let host: ArgumentsHost;
  let errorLog: jest.SpyInstance;

  beforeEach(() => {
    filter = new AllExceptionsFilter();
    response = { status: jest.fn(), json: jest.fn() };
    response.status.mockReturnValue(response);
    const request = { method: 'GET', originalUrl: '/bears' };
    host = {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => response,
      }),
    } as unknown as ArgumentsHost;
    errorLog = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
  });

  afterEach(() => jest.restoreAllMocks());

  it('returns HTTP exceptions unchanged', () => {
    filter.catch(new NotFoundException('Bear 1 not found'), host);

    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.json).toHaveBeenCalledWith({
      statusCode: 404,
      error: 'Not Found',
      message: 'Bear 1 not found',
    });
    expect(errorLog).not.toHaveBeenCalled();
  });

  it('keeps validation messages of a 400', () => {
    filter.catch(new BadRequestException(['size must be an integer']), host);

    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: ['size must be an integer'] }),
    );
  });

  it('hides unexpected errors behind a generic 500 and logs them', () => {
    const error = new Error('connection to database "bears" failed');

    filter.catch(error, host);

    expect(response.status).toHaveBeenCalledWith(500);
    expect(response.json).toHaveBeenCalledWith({
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
    expect(errorLog).toHaveBeenCalledWith(
      'Unhandled error on GET /bears',
      error.stack,
    );
  });

  it('handles thrown values that are not Error instances', () => {
    filter.catch('something odd', host);

    expect(response.status).toHaveBeenCalledWith(500);
    expect(errorLog).toHaveBeenCalledWith(
      'Unhandled error on GET /bears',
      'something odd',
    );
  });
});
