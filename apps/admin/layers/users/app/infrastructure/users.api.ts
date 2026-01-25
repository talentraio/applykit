const templateUrl = '/api/template';

export const templateApi = {
  async TemplateRequestApi(request: any) {
    const body = JSON.stringify(request);

    return await useApi(`${templateUrl}/template`, {
      method: 'POST',
      body
    });
  }
};
