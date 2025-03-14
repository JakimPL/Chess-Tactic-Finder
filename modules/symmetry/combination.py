from dataclasses import dataclass
from typing import Callable, FrozenSet, Tuple

from modules.symmetry.transformations import TransformationGroup


@dataclass(frozen=True)
class Combination:
    arrangement: Tuple[FrozenSet[int], ...]
    transformations: TransformationGroup

    def __eq__(self, other: "Combination") -> bool:
        if self.transformations.value != other.transformations.value:
            return False

        if len(self.arrangement) != len(other.arrangement):
            return False

        for function in self.transformations.value:
            if all(
                frozenset(map(function, self_squares)) == other_squares
                for self_squares, other_squares in zip(self.arrangement, other.arrangement)
            ):
                return True

        return False

    def __hash__(self) -> int:
        return hash((self.arrangement, self.transformations))

    @staticmethod
    def transform(
        arrangement: Tuple[FrozenSet[int], ...], transformation: Callable[[int], int]
    ) -> Tuple[FrozenSet[int]]:
        return tuple(frozenset(map(transformation, squares)) for squares in arrangement)

    def generate_all_combinations(self) -> Tuple["Combination", ...]:
        return tuple(Combination(arrangement, self.transformations) for arrangement in self.generate_all_arrangements())

    def generate_all_arrangements(self) -> Tuple[Tuple[FrozenSet[int], ...], ...]:
        return tuple(self.transform(self.arrangement, transformation) for transformation in self.transformations.value)

    def flatten(self) -> Tuple[int, ...]:
        return tuple(element for subset in self.arrangement for element in subset)
