import boysMaroonBackImg from '../assets/images/boys_maroon_back_mannequin_1794780976546.jpg';
import boysMaroonRoyalImg from '../assets/images/boys_maroon_royal_uniform_1794778418280.jpg';
import boysMaroonSideImg from '../assets/images/boys_maroon_side_mannequin_1794780976105.jpg';
import boysNavyCharcoalImg from '../assets/images/boys_navy_charcoal_uniform_1794778415742.jpg';
import boysPrimaryBackImg from '../assets/images/boys_primary_back_mannequin_1794780977211.jpg';
import boysPrimaryFrontImg from '../assets/images/boys_primary_front_mannequin_1794778890872.jpg';
import boysPrimarySideImg from '../assets/images/boys_primary_side_mannequin_1794780975924.jpg';
import boysSideStudioImg from '../assets/images/boys_uniform_side_studio_1794778889378.jpg';
import girlsGreenBackImg from '../assets/images/girls_green_back_mannequin_1794780974052.jpg';
import girlsGreenImg from '../assets/images/girls_green_uniform_set_1794778417988.jpg';
import girlsGreenSideImg from '../assets/images/girls_green_side_mannequin_1794780972640.jpg';
import girlsNavyPleatedImg from '../assets/images/girls_navy_pleated_uniform_1794778415649.jpg';
import girlsNavySideImg from '../assets/images/girls_navy_side_mannequin_1794780972997.jpg';
import girlsPrimaryBackImg from '../assets/images/girls_primary_back_mannequin_1794780974518.jpg';
import girlsPrimaryFrontImg from '../assets/images/girls_primary_front_mannequin_1794778890549.jpg';
import girlsPrimarySideImg from '../assets/images/girls_primary_side_mannequin_1794780974017.jpg';
import girlsBackStudioImg from '../assets/images/girls_uniform_back_studio_1794778888136.jpg';
import accessoriesPeImg from '../assets/images/uniform_accessories_pe_kit_1794778419717.jpg';
import boysBackStudioImg from '../assets/images/uniform_kit_back_studio_1794777525999.jpg';
import type { School, StudentGender, UniformAngle } from '../types/uniform';

export const DEPARTMENT_IMAGES = {
  girls: girlsNavyPleatedImg,
  boys: boysNavyCharcoalImg,
  accessories: accessoriesPeImg,
};

export function getUniformAnglesForSchool(
  school: School,
  gender: StudentGender
): Record<UniformAngle, string> {
  if (gender === 'Girls') {
    if (school.colors.primaryHex === '#14532D') {
      return {
        front: girlsGreenImg,
        side: girlsGreenSideImg,
        back: girlsGreenBackImg,
      };
    }
    if (school.level === 'Primary & Junior School (CBC)') {
      return {
        front: girlsPrimaryFrontImg,
        side: girlsPrimarySideImg,
        back: girlsPrimaryBackImg,
      };
    }
    return {
      front: girlsNavyPleatedImg,
      side: girlsNavySideImg,
      back: girlsBackStudioImg,
    };
  }

  // Boys
  if (
    school.colors.knitHex === '#7F1D1D' ||
    school.colors.primaryHex === '#1D4ED8'
  ) {
    return {
      front: boysMaroonRoyalImg,
      side: boysMaroonSideImg,
      back: boysMaroonBackImg,
    };
  }

  if (school.level === 'Primary & Junior School (CBC)' && !school.colors.hasBlazer) {
    return {
      front: boysPrimaryFrontImg,
      side: boysPrimarySideImg,
      back: boysPrimaryBackImg,
    };
  }

  return {
    front: boysNavyCharcoalImg,
    side: boysSideStudioImg,
    back: boysBackStudioImg,
  };
}

export function getUniformStudioImage(school: School, gender: StudentGender): string {
  return getUniformAnglesForSchool(school, gender).front;
}
