import sys
with open("src/app/(app)/mujer/MujerClientView.tsx", "r") as f:
    lines = f.readlines()

start = -1
for i, line in enumerate(lines):
    if "{showExamenModal && selectedPacienteExamen && (" in line:
        start = i
        break

print(f"Modal start: {start}")
