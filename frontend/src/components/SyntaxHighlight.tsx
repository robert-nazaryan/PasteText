import { useMemo } from 'react';
import hljs from 'highlight.js/lib/core';
import bash from 'highlight.js/lib/languages/bash';
import javascript from 'highlight.js/lib/languages/javascript';
import json from 'highlight.js/lib/languages/json';
import markdown from 'highlight.js/lib/languages/markdown';
import nginx from 'highlight.js/lib/languages/nginx';
import plaintext from 'highlight.js/lib/languages/plaintext';
import typescript from 'highlight.js/lib/languages/typescript';
import yaml from 'highlight.js/lib/languages/yaml';

hljs.registerLanguage('bash', bash);
hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('json', json);
hljs.registerLanguage('markdown', markdown);
hljs.registerLanguage('nginx', nginx);
hljs.registerLanguage('plaintext', plaintext);
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('yaml', yaml);

interface SyntaxHighlightProps {
  code: string;
}

function SyntaxHighlight({ code }: SyntaxHighlightProps) {
  const highlightedCode = useMemo(() => hljs.highlightAuto(code).value, [code]);

  return (
    <pre className="code-block">
      <code
        className="hljs"
        dangerouslySetInnerHTML={{ __html: highlightedCode }}
      />
    </pre>
  );
}

export default SyntaxHighlight;
