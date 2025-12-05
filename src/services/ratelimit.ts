const getKeyInfo = async () => {
  const apiKey = process.env.REACT_APP_OPENAI_API_KEY;

  const response = await fetch('https://openrouter.ai/api/v1/key', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });
  
  const keyInfo = await response.json();
  console.log(keyInfo);
  return keyInfo;
}

export { getKeyInfo };