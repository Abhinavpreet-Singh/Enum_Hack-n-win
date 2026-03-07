#include <stdio.h>
#include <stdlib.h>
#include <string.h>


#define _MAX_LINES 10000
#define _MAX_LINE_LEN 65536

static char* _lines[_MAX_LINES];
static int _lineCount = 0;
static int _lineIdx = 0;

void _readAllInput() {
  char buf[_MAX_LINE_LEN];
  while(fgets(buf, sizeof(buf), stdin)) {
    buf[strcspn(buf, "\r\n")] = '\0';
    _lines[_lineCount++] = strdup(buf);
  }
}

char* _nextLine() {
  if(_lineIdx < _lineCount) return _lines[_lineIdx++];
  return "";
}

int isPalindrome(int x) {
    // Write your code here
    return 0;
}


int main() {
  _readAllInput();

  int param0 = atoi(_nextLine());

  int result = isPalindrome(param0);
  printf("%s", result ? "true" : "false");

  return 0;
}
