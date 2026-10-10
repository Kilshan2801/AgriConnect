/*M!999999\- enable the sandbox mode */ 
-- MariaDB dump 10.19  Distrib 10.11.14-MariaDB, for debian-linux-gnu (x86_64)
--
-- Host: 127.0.0.1    Database: agriconnect
-- ------------------------------------------------------
-- Server version	10.11.14-MariaDB-0ubuntu0.24.04.1

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `resources`
--

DROP TABLE IF EXISTS `resources`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `resources` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `title` varchar(255) NOT NULL,
  `link` varchar(500) NOT NULL,
  `snippet` varchar(500) DEFAULT NULL,
  `display_link` varchar(255) DEFAULT NULL,
  `specialization` varchar(150) DEFAULT NULL,
  `is_top_rated` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=33 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `resources`
--

LOCK TABLES `resources` WRITE;
/*!40000 ALTER TABLE `resources` DISABLE KEYS */;
INSERT INTO `resources` VALUES
(1,'IRRI Rice Knowledge Bank','http://www.knowledgebank.irri.org/','Rice production techniques, agricultural technologies, and best farming practices based on IRRI research findings.','knowledgebank.irri.org','Rice',0,'2026-09-10 05:11:50'),
(2,'IRRI Agronomy Guides','http://www.knowledgebank.irri.org/agronomy-guides','Practical agronomy guidance on lowland, upland and dry-seeded rice production methods.','knowledgebank.irri.org','Rice',0,'2026-09-10 05:11:50'),
(3,'IRRI Water Management for Rice','http://www.knowledgebank.irri.org/step-by-step-production/growth/water-management','Good water management practices to maximize rice yields while conserving water.','knowledgebank.irri.org','Paddy Field',0,'2026-09-10 05:11:50'),
(4,'IRRI Step-by-Step Rice Production','http://www.knowledgebank.irri.org/step-by-step-production','A full walkthrough of rice production from pre-planting through post-harvest handling.','knowledgebank.irri.org','Paddy Field',0,'2026-09-10 05:11:50'),
(5,'Climate-Smart Rice Establishment Techniques','https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10151676/','Research comparing rice establishment techniques for productivity, water use and climate impact.','ncbi.nlm.nih.gov','Rice',0,'2026-09-10 05:11:50'),
(6,'Penn State Extension: Vegetables','https://extension.psu.edu/forage-and-food-crops/vegetables','University and extension-backed guidance covering the full range of vegetable production topics.','extension.psu.edu','Vegetables',0,'2026-09-10 05:11:50'),
(7,'Vegetable Soil Fertility and Management','https://extension.psu.edu/forage-and-food-crops/vegetables/soil-fertility-and-management','How to fertilize vegetable crops correctly based on soil testing and nutrient needs.','extension.psu.edu','Vegetables',0,'2026-09-10 05:11:50'),
(8,'Best Management Practices for Small Vegetable Farms','https://www.pubs.ext.vt.edu/FST/fst-481/fst-481.html','A practical guide to BMPs and Good Agricultural Practices (GAPs) for small vegetable growers.','pubs.ext.vt.edu','Vegetables',0,'2026-09-10 05:11:50'),
(9,'UF/IFAS Vegetable Gardening Guide','https://sfyl.ifas.ufl.edu/lawn-and-garden/vegetable-gardening/','Practical vegetable gardening guidance including soil pH, fertilizing and pest control.','sfyl.ifas.ufl.edu','Vegetables',0,'2026-09-10 05:11:50'),
(10,'FAO: Integrated Pest Management','https://www.fao.org/pest-and-pesticide-management/ipm/integrated-pest-management/en/?hl=en-US','How IPM reduces pesticide use while protecting crop yields and farmer income.','fao.org',NULL,1,'2026-09-10 05:11:50'),
(11,'FAO: Understanding Pest and Pesticide Management','https://www.fao.org/pest-and-pesticide-management/about/understanding-the-context/en/','FAO\'s vision for sustainable pest management as part of global food security goals.','fao.org',NULL,1,'2026-09-10 05:11:50'),
(12,'FAO: Save and Grow - Sustainable Crop Production','https://www.fao.org/4/i2215e/i2215e.pdf','An ecosystem approach to sustainably intensifying crop production worldwide.','fao.org',NULL,1,'2026-09-10 05:11:50'),
(13,'FAO: Soil Biodiversity and Soil Health','https://www.fao.org/4/i0211e/i0211e.pdf','Why soil biodiversity matters for long-term agricultural productivity and sustainability.','fao.org',NULL,1,'2026-09-10 05:11:50'),
(14,'Tea Research Institute of Sri Lanka','https://www.tri.lk/','The national body for tea research, cultivation technology and processing guidance in Sri Lanka.','tri.lk','Tea',0,'2026-09-10 07:06:25'),
(15,'Sri Lanka Tea Board: Cultivation','https://srilankateaboard.lk/ceylon-tea/fine-ceylon-tea/cultivation/','How Ceylon Tea is grown, pruned and cared for, including organic practices.','srilankateaboard.lk','Tea',0,'2026-09-10 07:06:25'),
(16,'Tea Plant Complete Cultivation Guide','https://wikifarmer.com/library/en/article/tea-plant-complete-cultivation-guide','A practical guide to tea planting, fertilization, pest control and harvesting.','wikifarmer.com','Tea',0,'2026-09-10 07:06:25'),
(17,'TRI Guideline: Cost Management in Tea Cultivation','https://www.tri.lk/wp-content/uploads/2022/01/TRISL_Guideline_04_2021e_Dec2021_StrategicCostManagement.pdf','Official TRI guidance on managing input costs and nutrient use in tea cultivation.','tri.lk','Tea',0,'2026-09-10 07:06:25'),
(18,'Coconut Research Institute of Sri Lanka','https://cri.gov.lk/en/home/','The national institute for coconut research, cultivar development and grower support.','cri.gov.lk','Coconut',0,'2026-09-10 07:06:25'),
(19,'CRI Latest Recommendations','https://cri.gov.lk/en/latest-recommendations/','Current recommended coconut cultivars and their performance across growing zones.','cri.gov.lk','Coconut',0,'2026-09-10 07:06:25'),
(20,'CRI Advisory Circulars','https://cri.gov.lk/en/advisory-circulars/','Guidance on planting materials, spacing, fertilizer use and soil conservation for coconut.','cri.gov.lk','Coconut',0,'2026-09-10 07:06:25'),
(21,'Coconut Development Authority','https://cda.gov.lk/web/index.php?lang=en','The government authority overseeing coconut industry development in Sri Lanka.','cda.gov.lk','Coconut',0,'2026-09-10 07:06:25'),
(22,'DEA: Cinnamon Cultivation Guide','https://dea.gov.lk/cinnamon/','Official guidance on cinnamon planting, fertilizing, pest control and harvesting.','dea.gov.lk','Spices',0,'2026-09-10 07:06:25'),
(23,'DEA: Pepper Cultivation Guide','https://dea.gov.lk/pepper/','Official guidance on black pepper cultivation from Sri Lanka\'s Dept. of Export Agriculture.','dea.gov.lk','Spices',0,'2026-09-10 07:06:25'),
(24,'DEA: Cardamom Cultivation Guide','https://dea.gov.lk/cardamom/','Official guidance on cardamom cultivation, the \"Queen of Spices\".','dea.gov.lk','Spices',0,'2026-09-10 07:06:25'),
(25,'DEA: Ginger Cultivation Guide','https://dea.gov.lk/ginger/','Official guidance on ginger cultivation and post-harvest handling.','dea.gov.lk','Spices',0,'2026-09-10 07:06:25'),
(26,'Rubber Development Department: Overview','https://www.rubberdev.gov.lk/index.php?option=com_content&view=article&id=17&Itemid=108&lang=en','Official overview of rubber cultivation development and extension services in Sri Lanka.','rubberdev.gov.lk','Rubber',0,'2026-09-10 07:06:25'),
(27,'DOA: Mango Cultivation Guide','https://doa.gov.lk/fruit-crops-mango-e/','Official soil, climate and cultivation guidance for mango from Sri Lanka\'s Dept. of Agriculture.','doa.gov.lk','Fruits',0,'2026-09-10 07:06:25'),
(28,'DOA: Agriculture Leaflets (Fruit Crops)','https://doa.gov.lk/naicc-publications-agriculture-leaflets/','A library of official leaflets covering banana, rambutan, passion fruit, dragon fruit and more.','doa.gov.lk','Fruits',0,'2026-09-10 07:06:25'),
(29,'DOA: Soil and Plant Nutrition Division','https://doa.gov.lk/hordi-division5-soil-and-plant-nutrition/','Research and advisory guidance on soil fertility, nutrient management and soil testing.','doa.gov.lk','Soil Management',0,'2026-09-10 07:06:25'),
(30,'DOA: Soil Fertility Map','https://doa.gov.lk/soil-fertility-map/','Soil fertility data and paddy soil fertility maps for Sri Lanka.','doa.gov.lk','Soil Management',0,'2026-09-10 07:06:25'),
(31,'Organic Agriculture as a Tool for Rural Development','https://www.renasl.org/5065/organic-agriculture-as-a-tool-for-rural-development-in-sri-lanka/','How organic practices improve soil fertility, yields and farmer income in Sri Lanka.','renasl.org','Organic Farming',0,'2026-09-10 07:06:25'),
(32,'The Growth of Organic Agriculture in Sri Lanka','https://www.renasl.org/5088/the-growth-and-development-of-organic-agriculture-in-sri-lanka/','The history and development of agroecological organic farming practices in Sri Lanka.','renasl.org','Organic Farming',0,'2026-09-10 07:06:25');
/*!40000 ALTER TABLE `resources` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-09-10  7:06:40
