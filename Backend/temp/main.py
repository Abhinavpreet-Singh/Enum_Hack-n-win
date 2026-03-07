import sys
_lines = sys.stdin.read().replace('\r', '').split('\n')
_line_idx = 0
def _next_line():
    global _line_idx
    if _line_idx < len(_lines):
        line = _lines[_line_idx]
        _line_idx += 1
        return line
    return ""

def merge(nums1: List[int], m: int, nums2: List[int], n: int) -> List[int]:
    # Write your code here
    pass


_n0 = int(_next_line())
_vl0 = _next_line()
param0 = list(map(int, _vl0.split())) if _vl0.strip() else []
param1 = int(_next_line())
_n2 = int(_next_line())
_vl2 = _next_line()
param2 = list(map(int, _vl2.split())) if _vl2.strip() else []
param3 = int(_next_line())

result = merge(param0, param1, param2, param3)
print(" ".join(map(str, result)))
