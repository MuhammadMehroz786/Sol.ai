import { ProcessedSignal } from './scoutGptService';

export const createMockSignals = (): ProcessedSignal[] => {
  const mockSignals: ProcessedSignal[] = [
    {
      id: 'mock-1',
      rank: 1,
      headline: 'AI Revolution Transforms Content Creation Industry',
      summary: 'Latest AI breakthroughs are revolutionizing how content creators approach storytelling, with new tools showing unprecedented creativity and efficiency.',
      tags: ['AI', 'Content Creation', 'Technology'],
      priority: 'High',
      timestamp: '2h',
      source: 'Mock Data',
      score: 95,
      engagement: '+78%',
      url: 'https://example.com/ai-revolution',
      user_id: 'mock-user',
      created_at: new Date().toISOString()
    },
    {
      id: 'mock-2',
      rank: 2,
      headline: 'Social Media Algorithm Changes Impact Brand Reach',
      summary: 'Major social platforms announce significant algorithm updates affecting how brands connect with their audiences, requiring new strategic approaches.',
      tags: ['Social Media', 'Marketing', 'Algorithms'],
      priority: 'High',
      timestamp: '4h',
      source: 'Mock Data',
      score: 87,
      engagement: '+62%',
      url: 'https://example.com/algorithm-changes',
      user_id: 'mock-user',
      created_at: new Date().toISOString()
    },
    {
      id: 'mock-3',
      rank: 3,
      headline: 'Gen Z Consumer Behavior Shifts Drive Market Changes',
      summary: 'New research reveals significant shifts in Gen Z purchasing patterns, emphasizing sustainability and authentic brand storytelling.',
      tags: ['Gen Z', 'Consumer Behavior', 'Marketing'],
      priority: 'Medium',
      timestamp: '6h',
      source: 'Mock Data',
      score: 82,
      engagement: '+45%',
      url: 'https://example.com/genz-behavior',
      user_id: 'mock-user',
      created_at: new Date().toISOString()
    },
    {
      id: 'mock-4',
      rank: 4,
      headline: 'Remote Work Technologies Enable Global Collaboration',
      summary: 'Advanced remote work tools are breaking down geographical barriers, enabling seamless collaboration across time zones and cultures.',
      tags: ['Remote Work', 'Technology', 'Collaboration'],
      priority: 'Medium',
      timestamp: '8h',
      source: 'Mock Data',
      score: 75,
      engagement: '+38%',
      url: 'https://example.com/remote-work',
      user_id: 'mock-user',
      created_at: new Date().toISOString()
    },
    {
      id: 'mock-5',
      rank: 5,
      headline: 'Sustainable Business Practices Gain Investor Interest',
      summary: 'ESG-focused investments reach record highs as investors prioritize companies with strong environmental and social governance practices.',
      tags: ['Sustainability', 'Investment', 'ESG'],
      priority: 'Low',
      timestamp: '12h',
      source: 'Mock Data',
      score: 68,
      engagement: '+29%',
      url: 'https://example.com/sustainable-business',
      user_id: 'mock-user',
      created_at: new Date().toISOString()
    }
  ];

  console.log('📝 Created', mockSignals.length, 'mock signals for testing');
  return mockSignals;
};