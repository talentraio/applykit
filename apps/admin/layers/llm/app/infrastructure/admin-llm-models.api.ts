import type {
  LlmModel,
  LlmModelCreateInput,
  LlmModelListResponse,
  LlmModelUpdateInput
} from '@int/schema';

const adminLlmModelsUrl = '/api/admin/llm/models';

export const adminLlmModelsApi = {
  async fetchAll(): Promise<LlmModelListResponse> {
    return await useApi(adminLlmModelsUrl, {
      method: 'GET'
    });
  },

  async create(input: LlmModelCreateInput): Promise<LlmModel> {
    return await useApi(adminLlmModelsUrl, {
      method: 'POST',
      body: input
    });
  },

  async update(id: string, input: LlmModelUpdateInput): Promise<LlmModel> {
    return await useApi(`${adminLlmModelsUrl}/${id}`, {
      method: 'PUT',
      body: input
    });
  },

  async delete(id: string): Promise<void> {
    await useApi(`${adminLlmModelsUrl}/${id}`, {
      method: 'DELETE'
    });
  }
};
