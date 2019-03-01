import "./styles.scss";
import * as d3 from 'D3';
import { QueryObject, VariantObject } from "./queryObject";
import { searchOMIM } from "./search";
const gCanvas = require('./graphRender');
var neoAPI = require('./neo4jLoader');
var search = require('./search');
var dataLoad = require('./fileDataLoad');
const qo = require('./queryObject');
import ky from 'ky';



d3.select('.search-icon').on('click', () => {
    const value = (document.getElementById('search-bar')).value;
    let dataOb = new qo.QueryObject(value);
    neoAPI.checkForNode(value).then(found => {
        if (found.length > 0) {
            console.log("already exists");
        } else {
            neoAPI.addToGraph(value, 'Gene');
        }
        search.searchBySymbol(dataOb).then(() => neoAPI.getGraph().then(g => gCanvas.drawGraph(g)));

    });
});

let canvas = d3.select('#graph-render').append('svg').classed('graph-canvas', true);
let linkGroup = canvas.append('g').classed('links', true);
let nodeGroup = canvas.append('g').classed('nodes', true);
let toolDiv = d3.select('body').append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);
let queryPanel = d3.select('#wrapper').append('div').attr('id', 'query-panel');

dataLoad.loadFile().then(d=> {
  //  dataLoad.renderSidebar(d);
    let dataOb = new qo.QueryObject(d[0].key);
    dataOb.type = "Gene";
    let varArray = d[0].values.map(v=> {
        let variant = new qo.QueryObject(v.id);
        variant.type = "Variant";
        Object.keys(v).map(key=> {
            variant.properties[key.toString()] = v[key];
            variant.Gene = d[0].key;
            variant.description = variant.name;
            variant.name = variant.dbSnps;
        });
        return variant
    });
  
    dataOb.fileVariants = varArray;
    
    search.searchBySymbol(dataOb).then(q=> {

        search.geneIdtoMim(q).then(d=> {
            searchOMIM(d).then(om=>{  
                neoAPI.addNode(om, 'Gene');

       
    let knownVariants = om.properties.allelicVariantList.map(v=> {
        let variantOb = new qo.VariantObject(v.dbSnps);
        variantOb.name = v.dbSnps;
        variantOb.gene = om.value;
        variantOb.mimNumber = v.mimNumber;
        variantOb.mutations = v.mutations;
        variantOb.description = v.name;
        variantOb.clinvarAccessions = variantOb.clinvarAccessions;
        variantOb.text = v.text;
        
        return variantOb;
    });

    let knownPhenotypes = om.properties.geneMap.phenotypeMapList.map(p=> {
        let pheno = p.phenotypeMap
        let phenoOb = new qo.PhenotypeObject(pheno.phenotype);
        phenoOb.mimNumber = pheno.momNumber;
        phenoOb.phenotype = phenoOb.phenotype;// "Bart-Pumphrey syndrome"
        phenoOb.phenotypeInheritance = pheno.phenotypeInheritance;
        phenoOb.phenotypeMappingKey = pheno.phenotypeMappingKey;
        phenoOb.phenotypeMimNumber = pheno.phenotypeMimNumber;
        return phenoOb;
    })

    gCanvas.renderSidebar(om);
    gCanvas.renderGeneDetail(om);
  
    neoAPI.addNodeArray(knownVariants).then(()=> {
        knownVariants.forEach(v=>{
            neoAPI.addRelation(v.name, 'Variant', om.value, 'Gene', 'Mutation');
        });
        neoAPI.getGraph().then(g => gCanvas.drawGraph(g));
    });


  
    neoAPI.addNodeArray(knownPhenotypes).then(()=> {
        let varNames = knownVariants.map(v=> v.description.toString())
      
        let relatedPhenotypes = knownPhenotypes.map(p=>{
         
            let pindex = varNames.indexOf(p.name.toUpperCase().toString())
            if(pindex > -1 ){
                p.varIds = knownVariants[pindex].name;
            }else{
                p.varIds = null;
            }
            return p;
        }).filter(p=> p.varIds != null);

        relatedPhenotypes.forEach(rel => {
            neoAPI.addRelation(rel.name, 'Phenotype', rel.varIds, 'Variant', 'Phenotype');
        });

  
    });

 
    /*
    om.fileVariants.forEach(variant => {
       
        let value = variant.properties.id;

        let proxy = 'https://cors-anywhere.herokuapp.com/';
        let url = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=clinvar&id='+value+'&retmode=json&apiKey=mUYjhLsCRVOuShEhrHLG_w'
       // 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=clinvar&id=328931&retmode=json&apiKey=mUYjhLsCRVOuShEhrHLG_w'
        let req = ky.get(proxy + url).json().then(d=> {
            
        
        });
        
    });*/
/*
    let variantIds = om.fileVariants.map(v=> v.properties.id);

    let varIdQuery = variantIds.join(',')

    let proxy = 'https://cors-anywhere.herokuapp.com/';
    let url = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=clinvar&id='+varIdQuery+'&retmode=json&apiKey=mUYjhLsCRVOuShEhrHLG_w'
   // 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=clinvar&id=328931&retmode=json&apiKey=mUYjhLsCRVOuShEhrHLG_w'
    let req = ky.get(proxy + url).json().then(d=> console.log(d));

  
    /*
                /*
                search.getPathways(om);
                gCanvas.renderGeneDetail(om);
                neoAPI.addNode(om, 'Gene');
                om.properties.allelicVariantList.forEach((variant) => {
                    variant.gene = om.value
                    neoAPI.addNode(variant, 'Variant').then(()=>{ 
                        neoAPI.addRelation(om.value,'Gene', variant.name, 'Variant', 'Mutation');
                    });
                 }).then(()=> neoAPI.getGraph().then(g => gCanvas.drawGraph(g)));*/
              //  .then(()=> neoAPI.getGraph().then(g => gCanvas.drawGraph(g)));
            });

        });
        

//neoAPI.getGraph().then(g => gCanvas.drawGraph(g));
    });
});