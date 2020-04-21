import path from 'path';
import fs from 'fs';
import csv from 'csv-parse';
import Transaction from '../models/Transaction';
import uploadConfig from '../config/upload';
import AppError from '../errors/AppError';
import CreateTransactionService from './CreateTransactionService';
// import CreateCategoryService from './CreateCategoryService';

interface Request {
  transactionsFileName: string;
}

interface TransactionFile {
  title: string;
  value: number;
  type: 'income' | 'outcome';
  category: string;
}

class ImportTransactionsService {
  private transactions: Transaction[];

  private transactionsFile: TransactionFile[];

  constructor() {
    this.transactions = [];
    this.transactionsFile = [];
  }

  async execute({ transactionsFileName }: Request): Promise<Transaction[]> {
    const transactionsFilePath = path.join(
      uploadConfig.directory,
      transactionsFileName,
    );

    const transactionsFileExists = await fs.promises.stat(transactionsFilePath);

    if (!transactionsFileExists) {
      throw new AppError('Error internal');
    }

    const createTransactionService = new CreateTransactionService();

    const transactionsCreated = async (): Promise<Transaction[]> => {
      return Promise.all(
        this.transactionsFile.map(({ title, value, type, category }) =>
          createTransactionService.execute({
            title,
            value,
            type,
            category,
          }),
        ),
      );
    };

    const fileCsv = fs
      .createReadStream(transactionsFilePath)
      .pipe(csv({ ltrim: true, columns: true }))
      .on('data', (data: TransactionFile) => {
        this.transactionsFile.push({ ...data, value: Number(data.value) });
      });

    this.transactions = await new Promise((resolve, _) => {
      fileCsv.on('end', async () => {
        const transactions = await transactionsCreated();
        resolve(transactions);
      });
    });

    await fs.promises.unlink(transactionsFilePath);

    return this.transactions;
  }
}

export default ImportTransactionsService;
