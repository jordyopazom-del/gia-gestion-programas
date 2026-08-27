import re

with open("src/app/(app)/mujer/MujerClientView.tsx", "r") as f:
    content = f.read()

tabs_html = """          Tamizaje PAP / VPH (25-64 años)
        </button>
        <button
          onClick={() => { setActiveTab("embarazadas"); setCurrentPage(1); setSelectedStatus("TODOS"); }}
          className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${
            activeTab === "embarazadas" 
            ? "bg-white text-purple-600 shadow-sm" 
            : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Embarazadas
        </button>"""

content = content.replace("          Tamizaje PAP / VPH (25-64 años)\n        </button>", tabs_html)

with open("src/app/(app)/mujer/MujerClientView.tsx", "w") as f:
    f.write(content)
print("Paso 2 aplicado (tabs)")
