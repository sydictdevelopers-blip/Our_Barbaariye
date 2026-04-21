import { crud } from '../services/api';

export async function deleteRow(row, config, onSuccess) {
  const form = config.fromRow ? config.fromRow(row) : row;
  const params = config.toParams(form);
  const result = await crud({ operation: 'delete', fn: config.fn, params });
  onSuccess(result);
}
