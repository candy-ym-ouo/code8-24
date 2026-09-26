import { Prisma } from '@prisma/client';
import { reconcilePageCountWithTracePage } from './domain.js';

type DbClient = Prisma.TransactionClient;

export async function getActiveTraceMaxPage(db: DbClient, userId: string, bookId: string): Promise<number> {
  const [dogEar, annotation, rereadMark] = await Promise.all([
    db.dogEar.aggregate({ where: { userId, bookId, deletedAt: null }, _max: { pageNumber: true } }),
    db.annotation.aggregate({ where: { userId, bookId, deletedAt: null }, _max: { startPage: true, endPage: true } }),
    db.rereadMark.aggregate({ where: { userId, bookId, deletedAt: null }, _max: { pageNumber: true } })
  ]);

  return Math.max(
    dogEar._max.pageNumber ?? 0,
    annotation._max.startPage ?? 0,
    annotation._max.endPage ?? 0,
    rereadMark._max.pageNumber ?? 0
  );
}

export async function reconcileBookPageCountWithActiveTraces(
  db: DbClient,
  input: { userId: string; bookId: string; pageCount: number | null }
): Promise<{ pageCount: number | null; maxTracePage: number }> {
  const maxTracePage = await getActiveTraceMaxPage(db, input.userId, input.bookId);
  return {
    pageCount: reconcilePageCountWithTracePage(input.pageCount, maxTracePage),
    maxTracePage
  };
}
