export const SUPPORTED_LANGUAGES = [
  {
    id: "web",
    name: "Web Dev (HTML/CSS/JS)",
    mode: "web_preview",
    defaultStarter:
      "<!DOCTYPE html>\n<html>\n<head>\n  <style>\n    /* CSS styles */\n  </style>\n</head>\n<body>\n  \n</body>\n</html>",
  },
  {
    id: "javascript",
    name: "JavaScript (ES6/Node)",
    mode: "test_cases",
    defaultStarter: "// Write your JavaScript function\n",
  },
  {
    id: "python",
    name: "Python 3",
    mode: "test_cases",
    defaultStarter: "# Write your Python 3 code\n",
  },
  {
    id: "java",
    name: "Java",
    mode: "test_cases",
    defaultStarter:
      "public class Solution {\n    public static void main(String[] args) {\n        \n    }\n}\n",
  },
  {
    id: "cpp",
    name: "C++ (GCC)",
    mode: "test_cases",
    defaultStarter:
      "#include <iostream>\nusing namespace std;\n\nint main() {\n    \n    return 0;\n}\n",
  },
  {
    id: "c",
    name: "C (Clang)",
    mode: "test_cases",
    defaultStarter:
      "#include <stdio.h>\n\nint main() {\n    \n    return 0;\n}\n",
  },
  {
    id: "csharp",
    name: "C# (.NET)",
    mode: "test_cases",
    defaultStarter:
      "using System;\n\nclass Program {\n    static void Main() {\n        \n    }\n}\n",
  },
  {
    id: "sql",
    name: "SQL (PostgreSQL / MySQL)",
    mode: "test_cases",
    defaultStarter: "-- Write your SQL query statement\n",
  },
  {
    id: "php",
    name: "PHP",
    mode: "test_cases",
    defaultStarter: "<?php\n// Write your PHP code\n",
  },
];
