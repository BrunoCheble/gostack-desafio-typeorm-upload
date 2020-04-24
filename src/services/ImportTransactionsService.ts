import path from 'path';
import fs from 'fs';
import csv from 'csv-parse';
import Transaction from '../models/Transaction';
import uploadConfig from '../config/upload';

import CreateTransactionService from './CreateTransactionService';

interface Request {
  fileName: string;
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

  async execute({ fileName }: Request): Promise<Transaction[]> {
    const createTransactionService = new CreateTransactionService();

    const transactionsFilePath = path.join(uploadConfig.directory, fileName);

    const csvParsed = csv({ ltrim: true, columns: true });

    const fileParsed = fs
      .createReadStream(transactionsFilePath)
      .pipe(csvParsed);

    fileParsed.on('data', (data: TransactionFile) => {
      this.transactionsFile.push({ ...data, value: Number(data.value) });
    });

    await new Promise(resolve => fileParsed.on('end', resolve));

    // eslint-disable-next-line no-restricted-syntax
    for (const { title, type, value, category } of this.transactionsFile) {
      // eslint-disable-next-line no-await-in-loop
      const transaction = await createTransactionService.execute({
        title,
        type,
        value,
        category,
      });
      this.transactions.push(transaction);
    }

    await fs.promises.unlink(transactionsFilePath);

    return this.transactions;
  }
}

export default ImportTransactionsService;
