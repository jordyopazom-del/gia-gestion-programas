import re

with open("src/app/(app)/mujer/MujerClientView.tsx", "r") as f:
    content = f.read()

# Fix filteredData to map from embarazadasData if activeTab is "embarazadas"
old_filteredData = """  const filteredData = useMemo(() => {
    let result = data;

    // Solo activos por defecto
    result = result.filter(p => !p.estado || p.estado === 'ACTIVO');"""
new_filteredData = """  const filteredData = useMemo(() => {
    let result = activeTab === "embarazadas" ? embarazadasData : data;

    // Solo activos por defecto
    result = result.filter(p => !p.estado || p.estado === 'ACTIVO');"""
content = content.replace(old_filteredData, new_filteredData)

with open("src/app/(app)/mujer/MujerClientView.tsx", "w") as f:
    f.write(content)
print("filteredData parcheado")
