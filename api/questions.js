// Debate questions for each category
const debateQuestions = {
  philosophy: [
    "Should we prioritize individual freedom or collective well-being in society?",
    "Is consciousness just an emergent property of complex information processing?",
    "Can moral truths exist independently of human opinion?",
    "Is the meaning of life something we discover or create?",
    "Should we embrace or resist technological augmentation of human capabilities?"
  ],
  technology: [
    "Will artificial intelligence ultimately benefit or threaten humanity?",
    "Should there be limits on genetic engineering and human enhancement?",
    "Is privacy a fundamental right in the digital age?",
    "Will automation create more jobs than it destroys?",
    "Should tech companies be regulated like public utilities?"
  ],
  science: [
    "Is the multiverse theory scientifically valid or just speculation?",
    "Should we prioritize space exploration or fixing Earth's problems?",
    "Is consciousness reducible to purely physical processes?",
    "Can we achieve sustainable energy without nuclear power?",
    "Should human cloning be permitted for medical purposes?"
  ],
  politics: [
    "Is democracy the best form of government for all societies?",
    "Should wealth inequality be addressed through redistribution?",
    "Can capitalism and environmental sustainability coexist?",
    "Is globalization beneficial or harmful to developing nations?",
    "Should voting be mandatory in democratic societies?"
  ]
};

module.exports = (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  
  try {
    const category = req.query.category;
    
    if (!category) {
      return res.status(400).json({ 
        success: false, 
        error: 'Category parameter is required' 
      });
    }
    
    if (debateQuestions[category]) {
      const questions = debateQuestions[category];
      const randomQuestion = questions[Math.floor(Math.random() * questions.length)];
      res.status(200).json({ success: true, question: randomQuestion });
    } else {
      res.status(400).json({ success: false, error: 'Invalid category' });
    }
  } catch (error) {
    console.error('Error in questions endpoint:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
