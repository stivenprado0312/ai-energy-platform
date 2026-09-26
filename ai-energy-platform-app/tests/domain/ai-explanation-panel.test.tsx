import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AiExplanationPanel } from '@/components/domain/ai-explanation-panel';
import { apiClient, ApiError } from '@/lib/api-client';

jest.mock('@/lib/api-client', () => {
  const actual = jest.requireActual('@/lib/api-client');
  return {
    ...actual,
    apiClient: {
      generateExplanation: jest.fn(),
    },
  };
});

const mockedGenerate = apiClient.generateExplanation as jest.MockedFunction<
  typeof apiClient.generateExplanation
>;

describe('AiExplanationPanel', () => {
  it('shows a Generate button when no explanation exists', () => {
    render(<AiExplanationPanel anomalyId="a1" existing={null} />);
    expect(screen.getByRole('button', { name: /generate explanation/i })).toBeInTheDocument();
  });

  it('calls the API on click and renders the explanation', async () => {
    mockedGenerate.mockResolvedValueOnce({
      anomalyId: 'a1',
      meterId: 'M-109',
      anomalyType: 'REAL_ANOMALY',
      severity: 'HIGH',
      priority: 'HIGH',
      confidence: 0.9,
      summary: 'Test summary',
      whyItMatters: 'Test reason',
      evidence: ['Evidence line 1'],
      recommendation: 'Test action',
      generatedAt: '2026-09-12T14:00:00Z',
    });

    render(<AiExplanationPanel anomalyId="a1" existing={null} />);
    await userEvent.click(screen.getByRole('button', { name: /generate explanation/i }));

    await waitFor(() => {
      expect(screen.getByText('Test summary')).toBeInTheDocument();
    });
    expect(screen.getByText('Test reason')).toBeInTheDocument();
    expect(screen.getByText('Evidence line 1')).toBeInTheDocument();
    expect(screen.getByText('Test action')).toBeInTheDocument();
  });

  it('shows an error message when the API fails', async () => {
    mockedGenerate.mockRejectedValueOnce(
      new ApiError(503, 'UNAVAILABLE', 'Service down'),
    );

    render(<AiExplanationPanel anomalyId="a1" existing={null} />);
    await userEvent.click(screen.getByRole('button', { name: /generate explanation/i }));

    expect(await screen.findByText(/Service down/)).toBeInTheDocument();
  });
});
