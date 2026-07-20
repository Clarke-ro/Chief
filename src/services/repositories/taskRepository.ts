import type { Task } from '@/features/tasks/types';
import { paginateArray, type PageParams, type PageResult } from '@/services/api/pagination';
import { taskInventory } from '@/mock/tasks/inventory';

/** Task inventory (detail route / future Today buckets). Ready for cursor paging. */
export const taskRepository = {
  list(): Task[] {
    return taskInventory;
  },

  listPage(params?: PageParams): PageResult<Task> {
    return paginateArray(taskInventory, params);
  },

  getById(id: string): Task | undefined {
    return taskInventory.find((task) => task.id === id);
  },
};
