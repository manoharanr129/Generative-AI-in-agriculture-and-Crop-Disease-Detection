import json
from pathlib import Path

class TreatmentAdvisor:
    def __init__(self):
        # Load treatment databases
        base_dir = Path(__file__).parent
        with open(base_dir / 'data/organic_recipes.json', 'r') as f:
            self.organic_data = json.load(f)
        
        with open(base_dir / 'data/inorganic_chemicals.json', 'r') as f:
            self.inorganic_data = json.load(f)
    
    def get_organic_treatment(self, disease_id):
        """
        Get organic fertilizer recipe for a disease
        Returns: Complete recipe with ingredients, preparation, and application
        """
        recipe = self.organic_data['recipes'].get(disease_id)
        
        if not recipe:
            return {
                'error': 'No organic treatment found for this disease',
                'disease_id': disease_id
            }
        
        return {
            'treatment_type': 'organic',
            'disease_id': disease_id,
            'recipe': recipe
        }
    
    def get_inorganic_options(self, disease_id):
        """
        Get list of available inorganic chemicals for a disease
        Returns: List of chemical options
        """
        chemicals = self.inorganic_data['chemicals'].get(disease_id, [])
        
        if not chemicals:
            return {
                'error': 'No inorganic treatments found for this disease',
                'disease_id': disease_id
            }
        
        return {
            'treatment_type': 'inorganic',
            'disease_id': disease_id,
            'available_chemicals': chemicals
        }
    
    def calculate_inorganic_dosage(self, disease_id, chemical_name, motor_capacity_liters, water_liters=None):
        """
        Calculate chemical fertilizer and water amounts based on motor capacity
        
        Args:
            disease_id: ID of the disease
            chemical_name: Name of the chemical fertilizer
            motor_capacity_liters: Total capacity of the spray motor in liters
            water_liters: Optional - specific water amount (defaults to motor capacity)
        
        Returns: Detailed mixing instructions with amounts
        """
        # Get chemical options for this disease
        chemicals = self.inorganic_data['chemicals'].get(disease_id, [])
        
        # Find the specific chemical
        chemical = next(
            (c for c in chemicals if c['name'].lower() == chemical_name.lower()),
            None
        )
        
        if not chemical:
            return {
                'error': f'Chemical "{chemical_name}" not found for this disease',
                'available_chemicals': [c['name'] for c in chemicals]
            }
        
        # Use motor capacity as water amount if not specified
        if water_liters is None:
            water_liters = motor_capacity_liters
        
        # Ensure water doesn't exceed motor capacity
        if water_liters > motor_capacity_liters:
            return {
                'error': f'Water amount ({water_liters}L) exceeds motor capacity ({motor_capacity_liters}L)'
            }
        
        # Calculate chemical amount based on recommended dose per liter
        dose_per_liter = chemical['recommended_dose_per_liter']
        
        # Extract numeric value and unit
        if 'g' in dose_per_liter:
            dose_value = float(dose_per_liter.replace('g', ''))
            dose_unit = 'g'
        elif 'ml' in dose_per_liter:
            dose_value = float(dose_per_liter.replace('ml', ''))
            dose_unit = 'ml'
        else:
            dose_value = float(dose_per_liter)
            dose_unit = 'g'
        
        # Calculate total chemical needed
        total_chemical = dose_value * water_liters
        
        # Calculate mixing ratio
        ratio_parts = chemical['mixing_ratio']['chemical_to_water'].split(':')
        chemical_parts = int(ratio_parts[0])
        water_parts = int(ratio_parts[1])
        
        return {
            'treatment_type': 'inorganic',
            'disease_id': disease_id,
            'chemical_details': {
                'name': chemical['name'],
                'active_ingredient': chemical['active_ingredient'],
                'concentration': chemical['concentration']
            },
            'motor_capacity': motor_capacity_liters,
            'mixing_instructions': {
                'water_amount': water_liters,
                'water_unit': 'liters',
                'chemical_amount': round(total_chemical, 2),
                'chemical_unit': dose_unit,
                'mixing_ratio': f'{chemical_parts}:{water_parts}',
                'remaining_capacity': motor_capacity_liters - water_liters
            },
            'application_steps': [
                f'Fill spray motor with {water_liters} liters of clean water',
                f'Measure {round(total_chemical, 2)} {dose_unit} of {chemical["name"]}',
                'Add chemical slowly to water while stirring',
                'Mix thoroughly for 2-3 minutes',
                'Ensure complete dissolution before spraying',
                f'Remaining motor capacity: {motor_capacity_liters - water_liters} liters (keep empty for agitation)'
            ],
            'safety_precautions': chemical['safety_precautions'],
            'recommended_dose_per_liter': dose_per_liter
        }
    
    def get_treatment_summary(self, disease_id, treatment_type, **kwargs):
        """
        Get complete treatment recommendation based on type
        
        Args:
            disease_id: ID of the disease
            treatment_type: 'organic' or 'inorganic'
            **kwargs: Additional parameters for inorganic (chemical_name, motor_capacity, water_amount)
        """
        if treatment_type == 'organic':
            return self.get_organic_treatment(disease_id)
        
        elif treatment_type == 'inorganic':
            chemical_name = kwargs.get('chemical_name')
            motor_capacity = kwargs.get('motor_capacity')
            water_amount = kwargs.get('water_amount')
            
            if not chemical_name or not motor_capacity:
                # Return available options if details not provided
                return self.get_inorganic_options(disease_id)
            
            return self.calculate_inorganic_dosage(
                disease_id,
                chemical_name,
                motor_capacity,
                water_amount
            )
        
        else:
            return {'error': 'Invalid treatment type. Choose "organic" or "inorganic"'}
