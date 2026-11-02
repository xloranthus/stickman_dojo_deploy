import type { MatchPayload } from '../types.ts';
import type { BackendApiClient } from './contracts.ts';


// an example usage in MatchController: api: new ApiClient('http://localhost:8000')
// calling the class when the match ends
// and this file packages the data, then sends it over the network to /api/v1/matches endpoint.

export class ApiClient implements BackendApiClient {
  private readonly baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:8000') {
    this.baseUrl = baseUrl;
  }

  async postMatch(payload: MatchPayload): Promise<unknown> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/matches`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Hiba történt a mentés során: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API hiba (postMatch):', error);
      throw error;
    }
  }

  async getLeaderboard(): Promise<unknown> {
    const response = await fetch(`${this.baseUrl}/api/v1/leaderboard`);
    if (!response.ok) throw new Error('Nem sikerült betölteni a ranglistát.');
    return await response.json();
  }
}