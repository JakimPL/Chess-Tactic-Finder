from enum import Enum


def e(x: int) -> int:
    return x


def s1(x: int) -> int:
    a = x >> 3
    b = x % 8
    return 8 * a + (7 - b)


def s2(x: int) -> int:
    a = x >> 3
    b = x % 8
    return 8 * (7 - a) + b


def o1(x: int) -> int:
    a = x >> 3
    b = x % 8
    return 8 * b + (7 - a)


def o2(x: int) -> int:
    return 63 - x


def o3(x: int) -> int:
    a = x >> 3
    b = x % 8
    return 8 * (7 - b) + a


class TransformationGroup(Enum):
    E = (e,)
    Z2 = (e, s1)
    D4 = (e, s1, s2, o1, o2, o3)
