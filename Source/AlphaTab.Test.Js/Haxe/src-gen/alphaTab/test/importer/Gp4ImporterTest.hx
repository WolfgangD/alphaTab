package alphaTab.test.importer;

using system.HaxeExtensions;
@:testClass
class Gp4ImporterTest extends alphaTab.test.importer.GpImporterTestBase
{
    @:testMethod
    public function TestScoreInfo() : Void 
    {
        var reader : alphaTab.importer.Gp3To5Importer = PrepareImporterWithFile("GuitarPro4/Test01.gp4");
        var score : alphaTab.model.Score = reader.ReadScore();
        alphaTab.test.Assert.AreEqual_T1_T22("Title", score.Title);
        alphaTab.test.Assert.AreEqual_T1_T22("Subtitle", score.SubTitle);
        alphaTab.test.Assert.AreEqual_T1_T22("Artist", score.Artist);
        alphaTab.test.Assert.AreEqual_T1_T22("Album", score.Album);
        alphaTab.test.Assert.AreEqual_T1_T22("Music", score.Words);// no words in gp4

        alphaTab.test.Assert.AreEqual_T1_T22("Music", score.Music);
        alphaTab.test.Assert.AreEqual_T1_T22("Copyright", score.Copyright);
        alphaTab.test.Assert.AreEqual_T1_T22("Tab", score.Tab);
        alphaTab.test.Assert.AreEqual_T1_T22("Instructions", score.Instructions);
        alphaTab.test.Assert.AreEqual_T1_T22("Notice1\r\nNotice2", score.Notices);
        alphaTab.test.Assert.AreEqual_T1_T22(5, score.MasterBars.Count);
        alphaTab.test.Assert.AreEqual_T1_T22(1, score.Tracks.Count);
        alphaTab.test.Assert.AreEqual_T1_T22("Track 1", score.Tracks.get_Item(0).Name);
        Render(score, "D:\\Dev\\AlphaTab\\AlphaTab2\\Source\\AlphaTab.Test\\Importer\\Gp4ImporterTest.cs", "TestScoreInfo");
    }

    @:testMethod
    public function TestNotes() : Void 
    {
        var reader : alphaTab.importer.Gp3To5Importer = PrepareImporterWithFile("GuitarPro4/Test02.gp4");
        var score : alphaTab.model.Score = reader.ReadScore();
        CheckTest02Score(score);
        Render(score, "D:\\Dev\\AlphaTab\\AlphaTab2\\Source\\AlphaTab.Test\\Importer\\Gp4ImporterTest.cs", "TestNotes");
    }

    @:testMethod
    public function TestTimeSignatures() : Void 
    {
        var reader : alphaTab.importer.Gp3To5Importer = PrepareImporterWithFile("GuitarPro4/Test03.gp4");
        var score : alphaTab.model.Score = reader.ReadScore();
        CheckTest03Score(score);
        Render(score, "D:\\Dev\\AlphaTab\\AlphaTab2\\Source\\AlphaTab.Test\\Importer\\Gp4ImporterTest.cs", "TestTimeSignatures");
    }

    @:testMethod
    public function TestDead() : Void 
    {
        var reader : alphaTab.importer.Gp3To5Importer = PrepareImporterWithFile("GuitarPro4/TestDead.gp4");
        var score : alphaTab.model.Score = reader.ReadScore();
        CheckDead(score);
        Render(score, "D:\\Dev\\AlphaTab\\AlphaTab2\\Source\\AlphaTab.Test\\Importer\\Gp4ImporterTest.cs", "TestDead");
    }

    @:testMethod
    public function TestGrace() : Void 
    {
        var reader : alphaTab.importer.Gp3To5Importer = PrepareImporterWithFile("GuitarPro4/TestGrace.gp4");
        var score : alphaTab.model.Score = reader.ReadScore();
        CheckGrace(score);
        Render(score, "D:\\Dev\\AlphaTab\\AlphaTab2\\Source\\AlphaTab.Test\\Importer\\Gp4ImporterTest.cs", "TestGrace");
    }

    @:testMethod
    public function TestAccentuation() : Void 
    {
        var reader : alphaTab.importer.Gp3To5Importer = PrepareImporterWithFile("GuitarPro4/TestAccentuations.gp4");
        var score : alphaTab.model.Score = reader.ReadScore();
        CheckAccentuation(score, false);
        Render(score, "D:\\Dev\\AlphaTab\\AlphaTab2\\Source\\AlphaTab.Test\\Importer\\Gp4ImporterTest.cs", "TestAccentuation");
    }

    @:testMethod
    public function TestHarmonics() : Void 
    {
        var reader : alphaTab.importer.Gp3To5Importer = PrepareImporterWithFile("GuitarPro4/TestHarmonics.gp4");
        var score : alphaTab.model.Score = reader.ReadScore();
        CheckHarmonics(score);
        Render(score, "D:\\Dev\\AlphaTab\\AlphaTab2\\Source\\AlphaTab.Test\\Importer\\Gp4ImporterTest.cs", "TestHarmonics");
    }

    @:testMethod
    public function TestHammer() : Void 
    {
        var reader : alphaTab.importer.Gp3To5Importer = PrepareImporterWithFile("GuitarPro4/TestHammer.gp4");
        var score : alphaTab.model.Score = reader.ReadScore();
        CheckHammer(score);
        Render(score, "D:\\Dev\\AlphaTab\\AlphaTab2\\Source\\AlphaTab.Test\\Importer\\Gp4ImporterTest.cs", "TestHammer");
    }

    @:testMethod
    public function TestBend() : Void 
    {
        var reader : alphaTab.importer.Gp3To5Importer = PrepareImporterWithFile("GuitarPro4/TestBends.gp4");
        var score : alphaTab.model.Score = reader.ReadScore();
        CheckBend(score);
        Render(score, "D:\\Dev\\AlphaTab\\AlphaTab2\\Source\\AlphaTab.Test\\Importer\\Gp4ImporterTest.cs", "TestBend");
    }

    @:testMethod
    public function TestTremolo() : Void 
    {
        var reader : alphaTab.importer.Gp3To5Importer = PrepareImporterWithFile("GuitarPro4/TestTremolo.gp4");
        var score : alphaTab.model.Score = reader.ReadScore();
        CheckTremolo(score);
        Render(score, "D:\\Dev\\AlphaTab\\AlphaTab2\\Source\\AlphaTab.Test\\Importer\\Gp4ImporterTest.cs", "TestTremolo");
    }

    @:testMethod
    public function TestSlides() : Void 
    {
        var reader : alphaTab.importer.Gp3To5Importer = PrepareImporterWithFile("GuitarPro4/TestSlides.gp4");
        var score : alphaTab.model.Score = reader.ReadScore();
        CheckSlides(score);
        Render(score, "D:\\Dev\\AlphaTab\\AlphaTab2\\Source\\AlphaTab.Test\\Importer\\Gp4ImporterTest.cs", "TestSlides");
    }

    @:testMethod
    public function TestVibrato() : Void 
    {
        var reader : alphaTab.importer.Gp3To5Importer = PrepareImporterWithFile("GuitarPro4/TestVibrato.gp4");
        var score : alphaTab.model.Score = reader.ReadScore();
        CheckVibrato(score, true);
        Render(score, "D:\\Dev\\AlphaTab\\AlphaTab2\\Source\\AlphaTab.Test\\Importer\\Gp4ImporterTest.cs", "TestVibrato");
    }

    @:testMethod
    public function TestTrills() : Void 
    {
        var reader : alphaTab.importer.Gp3To5Importer = PrepareImporterWithFile("GuitarPro4/TestTrills.gp4");
        var score : alphaTab.model.Score = reader.ReadScore();
        CheckTrills(score);
        Render(score, "D:\\Dev\\AlphaTab\\AlphaTab2\\Source\\AlphaTab.Test\\Importer\\Gp4ImporterTest.cs", "TestTrills");
    }

    @:testMethod
    public function TestOtherEffects() : Void 
    {
        var reader : alphaTab.importer.Gp3To5Importer = PrepareImporterWithFile("GuitarPro4/TestOtherEffects.gp4");
        var score : alphaTab.model.Score = reader.ReadScore();
        CheckOtherEffects(score, false);
        Render(score, "D:\\Dev\\AlphaTab\\AlphaTab2\\Source\\AlphaTab.Test\\Importer\\Gp4ImporterTest.cs", "TestOtherEffects");
    }

    @:testMethod
    public function TestFingering() : Void 
    {
        var reader : alphaTab.importer.Gp3To5Importer = PrepareImporterWithFile("GuitarPro4/TestFingering.gp4");
        var score : alphaTab.model.Score = reader.ReadScore();
        CheckFingering(score);
        Render(score, "D:\\Dev\\AlphaTab\\AlphaTab2\\Source\\AlphaTab.Test\\Importer\\Gp4ImporterTest.cs", "TestFingering");
    }

    @:testMethod
    public function TestStroke() : Void 
    {
        var reader : alphaTab.importer.Gp3To5Importer = PrepareImporterWithFile("GuitarPro4/TestStrokes.gp4");
        var score : alphaTab.model.Score = reader.ReadScore();
        CheckStroke(score);
        Render(score, "D:\\Dev\\AlphaTab\\AlphaTab2\\Source\\AlphaTab.Test\\Importer\\Gp4ImporterTest.cs", "TestStroke");
    }

    @:testMethod
    public function TestTuplets() : Void 
    {
        var reader : alphaTab.importer.Gp3To5Importer = PrepareImporterWithFile("GuitarPro4/TestTuplets.gp4");
        var score : alphaTab.model.Score = reader.ReadScore();
        CheckTuplets(score);
        Render(score, "D:\\Dev\\AlphaTab\\AlphaTab2\\Source\\AlphaTab.Test\\Importer\\Gp4ImporterTest.cs", "TestTuplets");
    }

    @:testMethod
    public function TestRanges() : Void 
    {
        var reader : alphaTab.importer.Gp3To5Importer = PrepareImporterWithFile("GuitarPro4/TestRanges.gp4");
        var score : alphaTab.model.Score = reader.ReadScore();
        CheckRanges(score);
        Render(score, "D:\\Dev\\AlphaTab\\AlphaTab2\\Source\\AlphaTab.Test\\Importer\\Gp4ImporterTest.cs", "TestRanges");
    }

    @:testMethod
    public function TestEffects() : Void 
    {
        var reader : alphaTab.importer.Gp3To5Importer = PrepareImporterWithFile("GuitarPro4/Effects.gp4");
        var score : alphaTab.model.Score = reader.ReadScore();
        CheckEffects(score);
        Render(score, "D:\\Dev\\AlphaTab\\AlphaTab2\\Source\\AlphaTab.Test\\Importer\\Gp4ImporterTest.cs", "TestEffects");
    }

    @:testMethod
    public function TestStrings() : Void 
    {
        var reader : alphaTab.importer.Gp3To5Importer = PrepareImporterWithFile("GuitarPro4/TestStrings.gp4");
        var score : alphaTab.model.Score = reader.ReadScore();
        CheckStrings(score);
        Render(score, "D:\\Dev\\AlphaTab\\AlphaTab2\\Source\\AlphaTab.Test\\Importer\\Gp4ImporterTest.cs", "TestStrings");
    }

    @:testMethod
    public function TestColors() : Void 
    {
        var reader : alphaTab.importer.Gp3To5Importer = PrepareImporterWithFile("GuitarPro4/Colors.gp4");
        var score : alphaTab.model.Score = reader.ReadScore();
        CheckColors(score);
        Render(score, "D:\\Dev\\AlphaTab\\AlphaTab2\\Source\\AlphaTab.Test\\Importer\\Gp4ImporterTest.cs", "TestColors");
    }

    public function new() 
    {
        super();
    }

}